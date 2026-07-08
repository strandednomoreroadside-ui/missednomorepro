# Demo Video Script + Shot List — "Hear the AI answer"

A 60-90 second video: a real call to your AI receptionist, with the dashboard
filling in live. Uses the existing **Test my AI** feature (Dashboard ->
Numbers -> "Test my AI"), which calls your phone and bridges you to your own
agent on live data. No sandbox - what you hear is what a customer hears.

---

## 0. Pre-flight (do NOT record until these pass)

1. Confirm the v5 deploy is live (Vercel shows the latest commit READY).
2. Place ONE throwaway "Test my AI" call first. This re-syncs the agent to v5
   (Fast Tier + ZIP/state fixes). Listen for: snappier responses, ZIP read as
   single digits, state said as "Ohio" not "O-H."
3. Only after that call sounds right, start recording.

Limits to respect: demo calls are capped (~3 min bridge), 5/day, 60s cooldown
between calls. Plenty for a 90s take, but space your retries past 60 seconds.

---

## 1. Recording setup (non-technical)

- **Audio:** put the phone on speaker right next to your computer mic, OR use a
  phone-call recording app and record the dashboard screen separately, then line
  them up in editing. Speaker-next-to-mic is simplest for take one.
- **Screen:** screen-record the dashboard (Windows: Win+Alt+R, or OBS). Have the
  **Inbox / pipeline** and the **dispatch board** visible or one click away so
  you can show the lead appear.
- **Frame:** record the whole browser window, not just a tab. Hide personal info
  (other customers) - use a test view or scroll to a clean state first.

---

## 2. The call script (you play the stranded customer)

Goal: hit all three fixes (state, ZIP, latency) AND show the price guardrail +
a dispatch landing in the CRM. Speak naturally, like you're actually stranded.

| Beat | You say | What to listen/watch for |
|---|---|---|
| Open | (AI greets with business name) | Greeting is prompt, natural |
| Problem | "Hey, I locked my keys in my car - I'm stranded at a grocery store." | AI asks one question at a time |
| Location | "I'm at 4 4 0 0 West 1 5 0th Street, Cleveland, Ohio - ZIP 4 4 1 3 5." | **AI reads the address/ZIP back digit-by-digit and says "Ohio"** (the fix) |
| Callback | "My number is 2 1 6, 5 5 5, 0 1 4 2." | AI reads it back cleanly |
| Price | "How much is that going to cost me?" | **AI quotes the EXACT computed total** (lockout = Zone fee + $50). Never a guess. |
| Dispatch | "Yeah, please send someone." | AI confirms help is coming, says it'll text an ETA |
| Close | "Thanks." | AI wraps and ends the call promptly |

Keep the whole call under ~75 seconds. If the AI rambles, that's a note for
tuning - but it shouldn't on v5.

---

## 3. The reveal (the money shot)

The instant the call ends, cut to the dashboard and show, in this order:
1. The **new contact / lead** appearing in the inbox/pipeline.
2. The **job on the dispatch board** with the address and service.
3. (Optional) the **confirmation text** on your phone with the ETA.

That "I just talked to it, and here's the booked job 3 seconds later" cut is the
whole pitch. Don't narrate it - let it land.

---

## 4. Edit / structure (60-90s)

```
0:00-0:08   Hook (text on screen): "A missed call is a lost job."
0:08-0:50   The live call (trimmed to the beats above)
0:50-1:05   Screen cut: lead + job appear on the dashboard
1:05-1:20   Offer card: "Answers 24/7. Books the job. Starting at $99/mo.
            7-day free trial." + your URL
```

- Add captions/subtitles - most social autoplay is muted, and captions also
  prove the AI's speech is clear.
- One concept per video. Don't cram booking + quoting + transfer into one cut;
  make separate shorts if you want to show each.

---

## 5. After recording

Your test call created junk rows in the live CRM (same as RED_TEAM). Clean up:

```
node scripts/redteam-wipe-number.mjs 2164151568            # dry run, review
node scripts/redteam-wipe-number.mjs 2164151568 --confirm  # delete
```

(That wipes the test number's footprint. Use your real test phone number if it
differs from the one above.)
