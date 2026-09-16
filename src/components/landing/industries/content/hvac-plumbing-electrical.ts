import type { CategoryFile } from "../types";

export const hvacPlumbingElectrical: CategoryFile = {
  intro:
    "Heating, cooling, plumbing, and electrical calls are some of the most urgent a homeowner makes, and they rarely wait for business hours. Missed No More Pro answers every call in your company's name, quotes the jobs you price by phone from your own rates, texts your on-call tech when something can't wait, and books the routine work into open slots on your calendar.",
  niches: {
    "drain-cleaning-sewer": {
      hook: "A backed-up drain or sewer line is a call nobody puts off. Answer every one, quote your drain cleaning rates on the spot, and get a truck moving while you're on another line.",
      why: "Drain and sewer calls come in two kinds: the slow kitchen sink someone finally got tired of, and the basement floor drain pushing sewage back up at 10 PM. The first is ready to book, the second needs someone now, and both are easy to lose to voicemail. The AI answers both in your company's name, sorts the urgent from the routine, and keeps the caller from dialing the next drain company on the list.",
      calls: [
        "Main line backups and sewage coming up through floor drains",
        "Clogged kitchen, bathroom, and laundry drains",
        "Hydro jetting and camera inspection requests",
        "Root intrusion and recurring clog calls",
        "Sewer line repair and replacement inquiries",
        "Callers outside your service area, answered on the call",
      ],
      quotes: "drain cleanings, main line clearing, hydro jetting, and camera inspections",
      estimates: "sewer line repairs and replacements you only price after a camera inspection",
      urgent: "sewage backing up into the house",
      booking: "drain cleanings",
      faqs: [
        {
          q: "Can the AI quote drain cleaning over the phone?",
          a: "Yes, for the jobs you price by phone. You set flat rates for services like a single drain, a main line, hydro jetting, or a camera inspection, plus travel zones and an after-hours fee. The AI reads back one exact total computed from those rules and never makes up a number.",
        },
        {
          q: "What happens when a caller has sewage backing up at night?",
          a: "The AI treats it as urgent. It takes the address and callback number, texts your on-call tech right away, and can text the caller a confirmation with an estimated arrival time. It can also warm-transfer the call to someone on your team.",
        },
      ],
    },
    "septic-services": {
      hook: "Septic customers call when an alarm is going off or the yard is wet. Answer every call, book pumpings into open slots, and flag the backups that can't wait.",
      why: "Septic work is part routine and part emergency. Homeowners call to schedule a pumping or an inspection before a home sale, and they also call when the tank alarm is sounding or water is surfacing in the yard. Real estate agents and buyers call on tight deadlines too. The AI answers every one in your company's name, captures the address and what the caller is seeing, and gets the right kind of response started.",
      calls: [
        "Tank pumping requests and routine maintenance",
        "Septic alarms sounding and slow or backed-up drains",
        "Inspections for home sales with closing deadlines",
        "Wet spots, odors, or standing water over the drain field",
        "Riser installs and tank locating questions",
        "Repair and drain field replacement inquiries",
      ],
      quotes: "tank pumpings, septic inspections, and riser installs",
      estimates: "drain field repairs and system replacements",
      urgent: "a septic backup or a tank alarm going off",
      booking: "pumpings and inspections",
      faqs: [
        {
          q: "Can it book septic pumpings for me?",
          a: "Yes. Connect Google Calendar and the AI books pumpings into open slots inside your hours, without double-booking, then texts the customer a confirmation and a reminder before the visit.",
        },
        {
          q: "How does it handle an inspection request tied to a home sale?",
          a: "It takes the property address, the caller's name and number, and the date they're working against, which lands in the call summary. It books the earliest open time on your calendar, or alerts your team if nothing fits.",
        },
      ],
    },
    "appliance-repair": {
      hook: "When the fridge is warm or the washer is full of water, customers call whoever answers first. Answer every call, quote your service call fee, and book the visit.",
      why: "Appliance repair calls are short and practical: what's broken, what brand, and how soon can someone come. Customers usually call several companies at once, so the first business to answer and give a clear next step tends to get the job. The AI answers in your company's name, notes the appliance and the problem in the call summary, quotes the fees you set, and books the first open time.",
      calls: [
        "Refrigerators not cooling and freezers icing over",
        "Washers that won't drain and dryers that won't heat",
        "Dishwashers leaking or not cleaning",
        "Ovens, ranges, and cooktops not heating",
        "Brand, warranty, and parts questions from your FAQ",
        "Customers asking for the soonest available visit",
      ],
      quotes: "diagnostic service calls and common flat-rate repairs",
      estimates: "repairs that depend on a diagnosis or a part you need to order",
      booking: "service calls",
      faqs: [
        {
          q: "Can the AI quote an appliance repair?",
          a: "It quotes what you price up front, like your diagnostic service call fee or flat-rate repairs, with travel zones and after-hours fees added from your rules. Repairs that depend on a diagnosis are captured for your tech instead of guessed.",
        },
        {
          q: "Will it know which brands we service?",
          a: "Yes, if you add them. Put your brands, warranty policy, and service area into your FAQs, and the AI answers from those in your words. If a caller asks about something you haven't covered, it takes their details for your team.",
        },
      ],
    },
    "commercial-refrigeration-repair": {
      hook: "A walk-in cooler going warm is inventory spoiling by the hour. Answer every call, day or night, and get your on-call tech moving before the product is lost.",
      why: "Commercial refrigeration customers are restaurants, grocers, and convenience stores, and when a walk-in or reach-in fails they need a tech now, not a callback in the morning. Those calls often come after closing, when a manager notices the temperature climbing. The AI answers every one in your company's name, captures the business, the address, and what's failing, and texts your on-call tech immediately.",
      calls: [
        "Walk-in coolers and freezers not holding temperature",
        "Reach-in units, prep tables, and display cases failing",
        "Ice machines down or leaking",
        "After-hours emergency calls from store and kitchen managers",
        "Preventive maintenance and service agreement scheduling",
        "Existing commercial accounts calling about open work",
      ],
      quotes: "service calls, emergency after-hours visits, and preventive maintenance visits",
      estimates: "compressor replacements and new equipment installs",
      urgent: "a walk-in cooler or freezer losing temperature",
      booking: "maintenance visits",
      faqs: [
        {
          q: "Can it handle refrigeration emergencies after hours?",
          a: "Yes. The AI answers around the clock, treats a failing cooler or freezer as urgent, texts your on-call tech right away, and can text the manager a confirmation with an estimated arrival time. Your after-hours fee is added automatically when the call comes in during that window.",
        },
        {
          q: "Does it recognize our existing commercial accounts?",
          a: "Returning callers are matched to their record in the built-in CRM and greeted by name, and each call is logged with a transcript and summary, so your team sees the full history before calling back.",
        },
      ],
    },
    "generator-installation-repair": {
      hook: "Generator calls spike the moment the power goes out. Answer every one, get urgent repairs to your on-call tech, and book the installs and maintenance that pay the bills.",
      why: "Generator businesses see two very different kinds of calls. During an outage, owners with a generator that won't start need help right away. The rest of the year, homeowners call about installing a standby unit after the last storm, and existing customers need annual maintenance. The AI answers all of them in your company's name and routes each one the right way.",
      calls: [
        "Standby generators that won't start during an outage",
        "Standby generator installation inquiries",
        "Annual maintenance and oil change visits",
        "Transfer switch and hookup questions",
        "Portable generator connection questions from your FAQ",
        "Warranty and brand questions",
      ],
      quotes: "service calls, annual maintenance visits, and diagnostic visits",
      estimates: "new standby generator installs that need a site visit and load calculation",
      urgent: "a generator that won't start during a power outage",
      booking: "maintenance visits and site visits",
      faqs: [
        {
          q: "Can it quote a whole-home generator install?",
          a: "Installs usually depend on a site visit, so the AI captures the address and what the homeowner wants and books the site visit into an open calendar slot. It quotes only the services you've priced, like maintenance or a service call.",
        },
        {
          q: "What happens when the power is out and the generator won't start?",
          a: "The AI treats it as urgent, takes the address and callback number, texts your on-call tech right away, and can text the customer a confirmation with an estimated arrival time.",
        },
      ],
    },
    "heating-oil-propane-delivery": {
      hook: "When a tank runs dry in January, customers call until someone picks up. Answer every call, get run-outs to your driver, and book the scheduled deliveries.",
      why: "Heating oil and propane companies take two kinds of calls: customers scheduling a delivery or joining automatic delivery, and customers who just ran out and have no heat. Run-out calls spike during cold snaps and often come in evenings and weekends. The AI answers every one in your company's name, captures the address and tank details the caller shares, treats a run-out as urgent, and books routine deliveries.",
      calls: [
        "Customers out of heating oil or propane with no heat",
        "Will-call delivery requests",
        "Automatic delivery sign-ups",
        "Tank and furnace or boiler service questions",
        "Payment plan and budget billing questions from your FAQ",
        "New customers asking about your delivery area",
      ],
      quotes: "delivery and emergency delivery fees, with the fuel added on top",
      estimates: "tank installs and tank swaps",
      urgent: "run out of heating oil or propane",
      booking: "deliveries",
      faqs: [
        {
          q: "Can the AI quote a heating oil delivery?",
          a: "It quotes the fees you set, like a standard or emergency delivery fee with your travel zones, and tells the caller the fuel is added on top. It never guesses a per-gallon price.",
        },
        {
          q: "What happens when a customer has run out?",
          a: "The AI treats it as urgent: it takes the address and callback number, texts your on-call driver right away, and can text the customer a confirmation with an estimated arrival time.",
        },
      ],
    },
    "grease-trap-cleaning": {
      hook: "A backed-up grease trap can shut a kitchen down mid-service. Answer every call, get emergencies to your truck, and keep routine pumpings on schedule.",
      why: "Grease trap customers are restaurants, cafeterias, and food processors that need regular pumping to stay compliant, plus emergency service when a trap backs up during service. Managers call between rushes and expect a fast answer. The AI answers in your company's name, captures the business, address, and trap details, treats a backup as urgent, and books scheduled pumpings.",
      calls: [
        "Grease traps backing up into the kitchen",
        "Scheduled pumping and cleaning visits",
        "Grease interceptor service for larger kitchens",
        "Compliance paperwork and pumping record questions",
        "New restaurant accounts",
        "Odor and slow drain complaints",
      ],
      quotes: "grease trap pumpings by trap size and emergency service calls",
      estimates: "large interceptors and multi-location accounts",
      urgent: "a grease trap backing up into the kitchen",
      booking: "pumpings",
      faqs: [
        {
          q: "Can the AI book recurring grease trap pumpings?",
          a: "It books each pumping into an open slot on your Google Calendar and texts the manager a confirmation and a reminder. Returning accounts are recognized by name in the CRM.",
        },
        {
          q: "How does it handle a backup during dinner service?",
          a: "It treats the call as urgent, captures the restaurant and address, texts your on-call driver right away, and can text the manager an estimated arrival time.",
        },
      ],
    },
    "solar-installers": {
      hook: "Solar leads are expensive to generate and easy to lose. Answer every call, capture the homeowner's details, and book the consultation.",
      why: "Solar inquiries come from homeowners who saw an ad, got a high electric bill, or heard about a neighbor's system. They ask about savings, financing, roof condition, and timelines, and many are comparing installers. Existing customers also call about monitoring alerts and panel issues. The AI answers in your company's name, answers questions from your FAQs, and books the consultation or service visit.",
      calls: [
        "New residential solar consultations",
        "Savings, financing, and incentive questions",
        "Battery storage add-on inquiries",
        "Existing systems with monitoring or production alerts",
        "Panel cleaning and service visits",
        "Panel removal and reinstall for roof work",
      ],
      quotes: "service calls and panel cleanings",
      estimates: "new system designs that depend on the roof and electric usage",
      booking: "consultations",
      faqs: [
        {
          q: "Will the AI promise savings or incentives?",
          a: "No. It answers only from the FAQs you write and never makes up savings figures, tax credits, or financing terms. Questions it can't answer from your information are taken for your team.",
        },
        {
          q: "Can existing customers get service booked?",
          a: "Yes. Returning customers are recognized in the CRM, and the AI books service visits into open slots and quotes the services you've priced, like a service call.",
        },
      ],
    },
    "water-treatment-wells": {
      hook: "No water from the well is an emergency, and water quality questions are ready-to-book leads. Answer every call and handle both the right way.",
      why: "Well and water treatment companies hear from homeowners with no water pressure, a pump that won't run, or water that smells, stains, or tests poorly. Some calls need a tech today; others are about testing, softeners, and filtration systems. The AI answers in your company's name, treats loss of water as urgent, and books testing and service visits for everything else.",
      calls: [
        "No water or low pressure from the well",
        "Well pump and pressure tank problems",
        "Water testing for home sales and new owners",
        "Softener, iron filter, and filtration questions",
        "Salt delivery and filter change service",
        "Sulfur smell and staining complaints",
      ],
      quotes: "water tests, service calls, and filter change visits",
      estimates: "new treatment systems and well pump replacements",
      urgent: "no water coming from the well",
      booking: "service visits",
      faqs: [
        {
          q: "Can the AI book water testing?",
          a: "Yes. It books testing visits into open slots on your calendar, quotes the testing you've priced with your travel zones, and texts a confirmation and reminder.",
        },
        {
          q: "What happens when a caller has no water?",
          a: "The AI treats it as urgent: it takes the address and callback number, texts your on-call tech right away, and can text the homeowner an estimated arrival time.",
        },
      ],
    },
  },
  variants: {
    "emergency-hvac": {
      title: "Emergency HVAC: overnight no-heat and no-cool calls",
      body: "For emergency HVAC service, the AI answers every after-hours call, treats no heat in winter and no cooling in a heat wave as urgent, texts your on-call tech right away, and can text the homeowner an estimated arrival time. Your after-hours fee is added to the quoted total automatically when the call lands in that window.",
    },
    "commercial-hvac": {
      title: "Commercial HVAC: property managers and business owners",
      body: "Commercial HVAC calls come from property managers, restaurant owners, and facility staff who need a rooftop unit or office system back online. The AI answers in your company's name, captures the business, the address, and what's failing, recognizes returning commercial accounts in the CRM, and texts your team when a call can't wait for morning.",
    },
    "emergency-plumbers": {
      title: "24/7 emergency plumbers",
      body: "For 24/7 emergency plumbing, the AI answers every call at any hour, treats burst pipes, active leaks, and backups as urgent, texts your on-call plumber immediately, and can text the caller a confirmation with an estimated arrival time. After-hours fees are added to the quote automatically, so the customer hears one exact total.",
    },
    "commercial-plumbing": {
      title: "Commercial plumbing: restaurants, offices, and property managers",
      body: "Commercial plumbing calls come from restaurants with a backed-up floor drain, offices with a leaking restroom, and property managers juggling several buildings. The AI captures the business and address, logs every call against the account in the CRM, and texts your team right away when a business can't operate until the problem is fixed.",
    },
    "commercial-electrical": {
      title: "Commercial electrical contractors",
      body: "For commercial electrical work, the AI answers calls from business owners and facility managers, captures the property and what's wrong, and treats power loss that shuts down a business as urgent by texting your on-call electrician. Tenant improvements and larger projects are captured with the details your estimator needs.",
    },
    "electricians-generator-service": {
      title: "Electricians who offer generator service",
      body: "If generators are one part of your electrical business, pick your main trade in setup and add your generator services to your price list. The AI answers generator questions from your FAQs, quotes the generator services you've priced, and books site visits for new installs alongside your other electrical work.",
    },
    "commercial-appliance-repair": {
      title: "Commercial appliance repair",
      body: "For commercial appliance repair, the AI answers calls from laundromats, restaurants, and property managers with laundry rooms, captures the business, address, and equipment, and texts your team when a down machine is costing the customer money. Returning accounts are matched in the CRM so your techs see the history.",
    },
    "restaurant-equipment-repair": {
      title: "Restaurant equipment repair",
      body: "Restaurant equipment calls, like a fryer, oven, or dish machine down during service, get treated as urgent: the AI captures the restaurant, the address, and the equipment, texts your on-call tech right away, and can text the manager an estimated arrival time.",
    },
  },
};
