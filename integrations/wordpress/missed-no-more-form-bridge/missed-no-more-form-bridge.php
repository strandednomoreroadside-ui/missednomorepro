<?php
/**
 * Plugin Name: Missed No More Form Bridge
 * Description: Sends Stranded No More service-request form submissions into Missed No More Pro while preserving the existing dispatch email plugin.
 * Version: 1.0.0
 * Author: Missed No More Pro
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('MNM_SERVICE_REQUEST_ENDPOINT')) {
    define('MNM_SERVICE_REQUEST_ENDPOINT', 'https://missednomorepro.com/api/forms/service-request');
}

if (!defined('MNM_SERVICE_REQUEST_TOKEN')) {
    define('MNM_SERVICE_REQUEST_TOKEN', '');
}

class MNM_Service_Request_Form_Bridge {
    const NONCE_ACTION = 'snm_service_request_submit';
    const NONCE_NAME = 'snm_service_request_nonce';
    const QUEUE_OPTION = 'mnm_service_request_retry_queue';
    const RETRY_HOOK = 'mnm_service_request_retry';
    const MAX_RETRIES = 5;
    const MAX_QUEUE = 25;

    public function __construct() {
        add_action('init', [$this, 'handle_submission'], 9);
        add_action(self::RETRY_HOOK, [$this, 'process_retry_queue']);
    }

    public function handle_submission() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['snm_service_request_submitted'])) {
            return;
        }

        $payload = $this->payload_from_post();
        if (!$payload) {
            return;
        }

        $this->send_or_queue($payload);
    }

    private function payload_from_post() {
        if (!isset($_POST[self::NONCE_NAME])) {
            return null;
        }

        $nonce = sanitize_text_field(wp_unslash($_POST[self::NONCE_NAME]));
        if (!wp_verify_nonce($nonce, self::NONCE_ACTION)) {
            return null;
        }

        if (!empty($_POST['snm_company_website'])) {
            return null;
        }

        $name = $this->clean_text($_POST['snm_name'] ?? '');
        $phone = $this->clean_text($_POST['snm_phone'] ?? '');
        $email = sanitize_email(wp_unslash($_POST['snm_email'] ?? ''));
        $service = $this->clean_text($_POST['snm_service'] ?? '');
        $location = $this->clean_text($_POST['snm_location'] ?? '');
        $vehicle = $this->clean_text($_POST['snm_vehicle'] ?? '');
        $details = $this->clean_textarea($_POST['snm_details'] ?? '');
        $consent = !empty($_POST['snm_sms_consent']);

        if (!$name || !$phone || !$service || !$location || !$consent) {
            return null;
        }

        return [
            'submission_id' => wp_generate_uuid4(),
            'submitted_at' => gmdate('c'),
            'source_url' => home_url(add_query_arg([], wp_unslash($_SERVER['REQUEST_URI'] ?? ''))),
            'name' => $name,
            'phone' => $phone,
            'email' => $email,
            'service' => $service,
            'location' => $location,
            'vehicle' => $vehicle,
            'details' => $details,
            'sms_consent' => $consent,
        ];
    }

    private function clean_text($value) {
        return sanitize_text_field(wp_unslash($value));
    }

    private function clean_textarea($value) {
        return sanitize_textarea_field(wp_unslash($value));
    }

    private function send_or_queue($payload) {
        if ($this->send_payload($payload)) {
            return;
        }

        $this->queue_payload($payload);
    }

    private function send_payload($payload) {
        $token = trim((string) MNM_SERVICE_REQUEST_TOKEN);
        if ($token === '') {
            return false;
        }

        $response = wp_remote_post(MNM_SERVICE_REQUEST_ENDPOINT, [
            'timeout' => 5,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-MNM-Form-Token' => $token,
            ],
            'body' => wp_json_encode($payload),
        ]);

        if (is_wp_error($response)) {
            return false;
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        return $code >= 200 && $code < 300;
    }

    private function queue_payload($payload) {
        $queue = get_option(self::QUEUE_OPTION, []);
        if (!is_array($queue)) {
            $queue = [];
        }

        $queue[] = [
            'payload' => $payload,
            'attempts' => 0,
            'next_at' => time() + 60,
        ];

        if (count($queue) > self::MAX_QUEUE) {
            $queue = array_slice($queue, -self::MAX_QUEUE);
        }

        update_option(self::QUEUE_OPTION, $queue, false);
        $this->schedule_retry();
    }

    public function process_retry_queue() {
        $queue = get_option(self::QUEUE_OPTION, []);
        if (!is_array($queue) || empty($queue)) {
            return;
        }

        $now = time();
        $remaining = [];

        foreach ($queue as $item) {
            $payload = $item['payload'] ?? null;
            $attempts = (int) ($item['attempts'] ?? 0);
            $next_at = (int) ($item['next_at'] ?? 0);

            if (!$payload || $attempts >= self::MAX_RETRIES) {
                continue;
            }

            if ($next_at > $now) {
                $remaining[] = $item;
                continue;
            }

            if ($this->send_payload($payload)) {
                continue;
            }

            $attempts++;
            if ($attempts < self::MAX_RETRIES) {
                $item['attempts'] = $attempts;
                $item['next_at'] = $now + min(3600, 60 * (2 ** $attempts));
                $remaining[] = $item;
            }
        }

        update_option(self::QUEUE_OPTION, array_slice($remaining, -self::MAX_QUEUE), false);

        if (!empty($remaining)) {
            $this->schedule_retry();
        }
    }

    private function schedule_retry() {
        if (!wp_next_scheduled(self::RETRY_HOOK)) {
            wp_schedule_single_event(time() + 60, self::RETRY_HOOK);
        }
    }
}

new MNM_Service_Request_Form_Bridge();
