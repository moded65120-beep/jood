export default {
  publicNavigation: {
    start: 'Get Started', welcome: 'Welcome to NOMU', choose: "Your journey starts here. Choose how you'd like to continue.",
    staff: 'Doctor / Nurse', staffText: 'Care for little lives.',
    parent: 'Parent', parentText: 'Every step, together.',
    backHome: 'Back to Home', upAbout: 'Swipe up to discover NOMU', downHome: 'Swipe down to Home',
    aboutTitle: 'About NOMU', aboutHeadline: 'Every little step matters.', introduction: "NOMU brings parents and healthcare professionals together in one caring space, making it easier to follow children's health, growth, and development.",
    mission: 'Our Mission', missionText: "We believe every child's journey deserves thoughtful care. NOMU helps families and healthcare professionals stay connected, informed, and ready for every milestone.",
    offers: 'What NOMU Offers', records: 'Child Health Records', recordsText: 'Important health information, all in one place.',
    growth: 'Growth & Development', growthText: 'Celebrate progress and follow every milestone.',
    appointments: 'Appointments & Follow-ups', appointmentsText: 'Stay connected with upcoming care and appointment requests.',
  },
  fatherHome: { noVisits: 'No medical visits yet', noDoctor: 'No doctor assigned' },
  "doctorProfiles": {
    "ourDoctors": "Our Doctors",
    "selectDoctor": "Select a Doctor",
    "medicalSpecialty": "Medical Specialty",
    "selectedDoctor": "Selected Doctor",
    "changePhoto": "Change Profile Photo",
    "uploadPhoto": "Upload Photo",
    "savePhoto": "Save Photo",
    "updated": "Photo Updated Successfully",
    "invalidFormat": "Invalid Image Format",
    "tooLarge": "Image Too Large",
    "sizeLimit": "Maximum File Size: 2 MB",
    "uploadFailed": "Photo Upload Failed",
    "notAllowed": "You may only change your own doctor profile photo.",
    "preview": "Selected profile photo preview",
    "storageNote": "Demo photo storage: saved in IndexedDB in this browser only. Other browsers and devices will use the default photo."
  },
  doctorProfilePage: {
    title: 'My Profile',
    subtitle: 'Manage your personal and professional information',
    identity: 'Doctor information',
    doctor: 'Doctor',
    femaleDoctor: 'Doctor',
    contact: 'Contact Information',
    phone: 'Phone Number',
    email: 'Email Address',
    editContact: 'Edit contact',
    about: 'About Me',
    editAbout: 'Edit biography',
    bioLabel: 'Professional biography',
    emptyBio: 'Share a little about your professional background and approach to care.',
    professional: 'Professional Information',
    specialty: 'Medical Specialty',
    experience: 'Years of Experience',
    years: 'years',
    notProvided: 'Not provided yet',
    save: 'Save',
    cancel: 'Cancel',
    saved: 'Your changes have been saved.',
    invalidPhone: 'Enter a valid phone number with 7–15 digits.',
    invalidEmail: 'Enter a valid email address.',
    bioTooLong: 'Please keep your biography within 2,000 characters.',
    saveFailed: 'Your changes could not be saved. Your edits are still available. Please try again.',
    loadFailed: 'Your saved profile information could not be read. Editing is disabled to protect it. Please refresh and try again.',
    notAllowed: 'You can only edit your own doctor profile.',
  },
  parentHome: {
    welcomeBefore: 'Welcome back,', welcomeAfter: '!', subtitle: "Here's an overview of your children's health journey.",
    information: 'Children Information', childCount: '{count} Children', name: 'Child Name', birthDate: 'Date of Birth',
    birthPlace: 'Place of Birth', age: 'Age', gender: 'Gender', male: 'Male', female: 'Female', notAvailable: 'Not available',
  },
  parentRegistration: {
    phoneInvalid: 'Enter a valid phone number containing 7–15 digits, with an optional country code.',
    role: 'Parent role', roleRequired: 'Please select Mother or Father.',
    idInvalid: 'Enter a 10-digit demo ID starting with 300 for Mother or 400 for Father.',
    duplicateId: 'This National ID is already registered.', duplicateEmail: 'This email is already registered.',
    storageError: 'Unable to save the demo account. Browser storage may be unavailable or invalid. Existing data has been preserved.',
    success: 'Your demo account was created successfully. Please log in.',
    notice: 'Development demo only. Use fictional details; accounts are stored in this browser.',
  },
  "growthNotes": {
    "title": "Doctor's Notes", "optionalLabel": "Doctor Notes (optional)",
    "button": "Doctor Notes", "selectMeasurement": "Measurement for this note",
    "chooseMeasurement": "Select an existing measurement", "noMeasurements": "Add a measurement before saving a note.",
    "save": "Save Note", "saving": "Saving…", "saved": "Note saved.",
    "failed": "Note could not be saved. The record may have changed. Reselect the measurement to load its latest note and try again."
  },
  "growthIntegration": {
    "persistenceNotice": "Measurements are saved in this browser's shared demo medical record.",
    "missingProfile": "A valid date of birth and recorded sex are required to add growth measurements. Existing records are preserved.",
    "saveFailed": "Measurement could not be saved. The record may have changed in another tab or browser storage may be unavailable. Review the current record and try again."
  },
  "growth": {
  "ageAtMeasurement": "Age at Measurement",
  "warningClinicalReview": "This measurement is outside the usual WHO reference range. Please review it.",
  "warningPotentialError": "This measurement is highly unusual. Please verify the value and unit.",
  "warningConfirmation": "I reviewed this measurement and its unit and want to keep it.",
  "warningConfirmationRequired": "Review this measurement and confirm its value and unit before saving.",
  "warningUnavailable": "WHO-based checks could not be completed for one or more fields. Check the child's details, date, measurement method, and reference availability. Saving remains available; these values have not been classified as normal.",
  "male": "Male",
  "measurementMethod": "Length/height measurement method",
  "selectMethod": "Select the method actually used",
  "recumbent_length": "Recumbent length (lying down)",
  "standing_height": "Standing height",
  "methodRequired": "Select whether the child was measured lying down or standing.",
  "days": "days",
  "kg": "kg",
  "cm": "cm",
  "ageMonths": "Age (months)",
  "whoReference": "Official WHO reference curves",
  "childMeasurements": "Child measurements",
  "measuredValue": "Measured value",
  "plottedValue": "Adjusted value plotted",
  "whoAdjustment": "WHO method adjustment",
  "sdMinus3": "−3 SD",
  "sdMinus2": "−2 SD",
  "sdMedian": "0 SD (median)",
  "sdPlus2": "+2 SD",
  "sdPlus3": "+3 SD",
  "curveLegend": "Reference curves and child measurements",
  "noMeasurements": "No measurements to display yet. Save measurements to add the child's points.",
  "referenceUnavailable": "WHO reference data is unavailable. Check the child's sex and birth date, then reload.",
  "thirdBirthdayEnd": "The chart ends on the child's third birthday. Month positions use WHO's 30.4375 days per month.",
  "lengthConvention": "Length is used through day 730; height from day 731. The curves and child lines remain separate at this transition. Tooltips show any official 0.7 cm method adjustment; raw measurements are unchanged.",
  "missingMethod": "Length/height records without a recorded measurement method are not plotted.",
  "measurementDetails": "View measurement dates and original values",
  "ageRange": "The measurement date must fall between birth and 36 months of age (up to the third birthday).",
  "pageTitle": "Doctor Growth Chart",
  "childInfo": "Child Information",
  "sampleNotice": "Fictional sample child",
  "childName": "Child name",
  "sex": "Sex",
  "female": "Female",
  "age": "Age",
  "years": "years",
  "months": "months",
  "addMeasurements": "Add New Measurements",
  "sessionNotice": "Measurements are kept only on this page and are cleared when you leave or refresh.",
  "measurementDate": "Measurement date",
  "weightKg": "Weight (kg)",
  "heightCm": "Length/Height (cm)",
  "headCircumferenceCm": "Head Circumference (cm)",
  "saveAndView": "Save Measurements & View Growth Chart",
  "required": "This measurement is required.",
  "positiveNumber": "Enter a positive, finite decimal number using a dot or comma decimal separator.",
  "dateRequired": "Enter a valid measurement date.",
  "dateBeforeBirth": "The measurement date cannot be before the child?s birth date.",
  "dateFuture": "The measurement date cannot be in the future.",
  "saved": "Measurements saved for this session.",
  "latestEntry": "Most Recently Entered Measurements",
  "chartTitle": "Child Growth Chart",
  "weightKgTab": "Weight-for-Age",
  "heightCmTab": "Length/Height-for-Age",
  "headCircumferenceCmTab": "Head Circumference-for-Age",
  "chartPlaceholder": "Chart placeholder ? no growth curves or percentiles are displayed yet.",
  "whoLater": "Official WHO growth standards based on the child?s age and sex will be added in a later phase."
},
  "motherGrowth": {
  "pageTitle": "Your Child's Growth",
  "currentAge": "Current age",
  "latestMeasurements": "Latest Measurements",
  "insightsTitle": "Your Child's Growth Insights",
  "notAvailable": "Not available",
  "childUnavailable": "Child information is not available yet.",
  "previewNotice": "Development preview: fictional child and sample measurements. These are not real patient records or live updates from the doctor page.",
  "empty": "No growth measurements have been recorded yet. Measurements will appear here after your child's doctor records them.",
  "invalid": "No valid measurement is available for this indicator within birth through the third birthday. The date, value, or recorded measurement method may need review by the doctor.",
  "invalidMeasurements": "No usable measurements are available within birth through the third birthday. Ask the doctor to review the recorded dates, values, and measurement methods.",
  "unavailable": "WHO reference information could not be evaluated for this measurement. No interpretation is available. Your child's doctor can help review the record.",
  "excluded": "Some records could not be used for this indicator. This description uses the latest valid recorded measurement.",
  "adjustedHeight": "The WHO comparison uses the recorded measurement method with the official 0.7 cm length/height adjustment. The original measurement is unchanged. Adjusted comparison value:",
  "disclaimer": "Growth charts are screening tools, not a diagnosis. Your doctor can help interpret your child's growth over time.",
  "weightKg": {
    "median": "Your child's recorded weight is at the WHO reference median for children of the same age and sex.",
    "above": "Your child's recorded weight is above the WHO reference median for children of the same age and sex. This comparison alone does not indicate whether growth is healthy or diagnose overweight.",
    "below": "Your child's recorded weight is below the WHO reference median for children of the same age and sex. This comparison alone does not indicate whether growth is healthy.",
    "review": "Your child's recorded weight is outside a WHO review threshold. Discuss this measurement with your child's doctor; it does not establish a diagnosis."
  },
  "heightCm": {
    "median": "Your child's recorded length or height is at the WHO reference median for children of the same age and sex.",
    "above": "Your child's recorded length or height is above the WHO reference median for children of the same age and sex. This comparison alone does not indicate whether growth is healthy.",
    "below": "Your child's recorded length or height is below the WHO reference median for children of the same age and sex. This comparison alone does not indicate whether growth is healthy.",
    "review": "Your child's recorded length or height is outside a WHO review threshold. Discuss this measurement with your child's doctor; it does not establish a diagnosis."
  },
  "headCircumferenceCm": {
    "median": "Your child's recorded head circumference is at the WHO reference median for children of the same age and sex.",
    "above": "Your child's recorded head circumference is above the WHO reference median for children of the same age and sex. This comparison alone does not indicate whether growth is healthy.",
    "below": "Your child's recorded head circumference is below the WHO reference median for children of the same age and sex. This comparison alone does not indicate whether growth is healthy.",
    "review": "Your child's recorded head circumference is outside a WHO review threshold. Discuss this measurement with your child's doctor; it does not establish a diagnosis."
  }
},
  "doctorAuth": {
    "invalid": "Invalid Doctor ID or password.",
    "logoutConfirm": "Log out of the doctor portal?"
},
  "demoReschedule": {
    "title": "Reschedule",
    "select": "Select a New Date & Time",
    "confirm": "Confirm Reschedule",
    "previous": "Previous Appointment",
    "next": "New Appointment",
    "success": "Appointment rescheduled successfully!",
    "noSlots": "No available appointments",
    "notEligible": "Only your own active, upcoming bookings with a known mother-created origin can be rescheduled.",
    "changed": "This appointment changed while you were viewing it. Close this window and reopen it to use the latest details."
  },
  "parentingTips": {
    "title": "A Little Tip for Today",
    "another": "Another Tip",
    "accountMenu": "Mother account menu",
    "categories": {
      "nutrition": "Nutrition",
      "sleep": "Sleep",
      "hygiene": "Hygiene",
      "safety": "Safety",
      "development": "Development",
      "play": "Play and Communication"
    }
  },
  "demoBooking": {
    "title": "Book a demo appointment",
    "demoLabel": "Fictional demo provider",
    "notice": "Demo only: these doctors, clinics, and schedules are fictional. Bookings are saved in this browser only, are not synchronized across devices, and are not confirmed by a real clinic.",
    "toggle": "Show or hide booking options for",
    "cardHint": "Explore fictional providers and book a demo visit.",
    "nextAppointment": "Next appointment",
    "chooseDoctor": "Choose a demo doctor",
    "selectDoctor": "Select doctor",
    "specialty": "Specialty",
    "clinic": "Demo hospital or clinic",
    "clinicahmad": "Demo Bluebird Pediatric Clinic — fictional",
    "clinicrania": "Demo Rose Family Clinic — fictional",
    "clinicomar": "Demo Sunrise Children's Center — fictional",
    "clinicdemo-doctor-sarah-ahmad": "Demo Pediatric Neurology Clinic — fictional",
    "clinicyazan": "Demo Pediatric Digestive Care Clinic — fictional",
    "clinicfadi": "Demo Child Development Clinic — fictional",
    "doctorStep": "Doctor",
    "slotStep": "Date and time",
    "reviewStep": "Review",
    "progress": "Booking progress",
    "noSlots": "No available slots. Choose another date or doctor.",
    "review": "Review booking",
    "confirm": "Confirm demo booking",
    "successTitle": "Demo booking saved",
    "successMessage": "Your demo booking is confirmed locally in this browser. No real clinic has received or confirmed this appointment.",
    "viewAppointments": "View appointments",
    "confirmed": "Demo confirmed — browser only",
    "storageError": "Demo bookings or reservations could not be loaded or saved. Check browser storage and try again. No new booking was confirmed.",
    "invalidSlot": "This slot is no longer available or is in the past. Go back and select an available date and time.",
    "duplicate": "This doctor and time are already reserved in this browser. Go back and choose another slot.",
    "yourBookings": "Your child's demo bookings",
    "noBookings": "No demo bookings in this category.",
    "appointmentsNotice": "Doctor-scheduled follow-ups and browser-only demo bookings are shown here. Demo bookings do not represent real clinic appointments."
  },
  "portal": {
    "yourFamily": "A little care, every day",
    "nextFollowUp": "Next doctor-scheduled follow-up",
    "noFollowUp": "No upcoming follow-up",
    "childrenSubtitle": "Your children, their health, and every step ahead.",
    "phone": "Phone number",
    "profileSubtitle": "Your available account information, all in one place.",
    "demoAccount": "Demo account",
    "notProvided": "Not provided",
    "settingsSubtitle": "Make nomu feel right for you.",
    "languagePreferences": "Language preferences",
    "languageHelp": "Choose your preferred language. Your choice is saved on this browser.",
    "accountInformation": "Account information",
    "accountHelp": "This is a frontend demo. Account changes will be available when connected to the care team.",
    "accountType": "Account type",
    "quickActions": "Explore your portal",
    "childrenAction": "View your children's profiles",
    "appointmentsAction": "View doctor-scheduled visits",
    "profileAction": "Your account information",
    "settingsAction": "Language and preferences",
    "appointmentsSubtitle": "Stay informed about your children's doctor-scheduled visits.",
    "doctorScheduled": "Follow-up visits are scheduled by your doctor. This view is read-only.",
    "noAppointments": "No follow-up visits here yet",
    "emptyAppointmentsHelp": "Doctor-scheduled visits will appear here when available."
  },
  "unifiedLogin": {
    "userId": "National ID or Employee ID",
    "title": "Welcome to nomu",
    "subtitle": "Your digital gateway to children's health and development",
    "login": "Sign In",
    "signup": "Don't have an account? Sign Up",
    "invalid": "Invalid ID or password. Please try again.",
    "demoNotice": "Fictional demo accounts only. Real authentication and permissions require the backend.",
    "roles": { "doctor": "Doctor", "nurse": "Nurse", "mother": "Mother", "father": "Father" },
    "parentDashboard": "Parent Dashboard",
    "welcome": "Welcome back, {name}!",
    "permissionsTitle": "Access permissions",
    "nurseLimited": "Nurse permissions are not configured yet. This demo allows the patient-list overview only. Clinical records, editing and Calendar management require an authorized permission policy.",
    "fatherProfileLimited": "Father profile editing and settings are not available yet. This explicit demo co-parent shares the existing fictional family's read-only medical information."
  },
  "home": {
    "about": {
      "button": "About Us",
      "title": "من نحن | About Us",
      "close": "Close About Us",
      "description": "Nemo is an integrated digital health platform that aims to make it easier to follow children's health and growth by connecting parents and doctors in one environment. It allows doctors to manage medical records and document visits, diagnoses, and prescriptions, and to track vaccinations, growth, and appointments, while enabling parents to view their children's health information, follow their developmental stages, and easily request medical appointments, strengthening communication and contributing to more organized and integrated healthcare."
    },
    "nemoAuth": {
      "swipeDown": "Swipe down to go back",
      "parentTitle": "Welcome, parents",
      "doctorTitle": "Welcome, doctor",
      "signupTitle": "Start your family's journey",
      "parentSubtitle": "A caring space for every step of your child's growth.",
      "doctorSubtitle": "Sign in to continue your patients' care.",
      "login": "Login",
      "signup": "Sign Up",
      "modeLabel": "Parent account mode",
      "nationalId": "National ID",
      "doctorId": "Doctor ID",
      "fullName": "Full Name",
      "email": "Email",
      "password": "Password",
      "phone": "Phone Number",
      "nationalIdPlaceholder": "Enter your national ID",
      "doctorIdPlaceholder": "Enter your doctor ID",
      "fullNamePlaceholder": "Enter your full name",
      "emailPlaceholder": "Enter your email address",
      "passwordPlaceholder": "Enter your password",
      "phonePlaceholder": "Enter your phone number",
      "nationalIdRequired": "Please enter your ID.",
      "fullNameRequired": "Please enter your full name.",
      "emailRequired": "Please enter your email address.",
      "passwordRequired": "Please enter your password.",
      "phoneRequired": "Please enter your phone number.",
      "signIn": "Sign In",
      "createAccount": "Create Account",
      "backPortals": "Back to portal selection",
      "wrongPortal": "This account belongs to the other portal. Return and choose the appropriate portal.",
      "unavailable": "We couldn't complete your request. Please try again.",
      "demoIdHint": "Demo registration uses 10-digit IDs: 300… for Mother or 400… for Father. No child profiles are created or linked automatically."
    },
    "nemo": {
      "pageTitle": "NOMU | نمو",
      "brandHome": "NOMU home",
      "arabicName": "نمو",
      "eyebrow": "Little steps. A brighter tomorrow.",
      "heading": "Growing together.",
      "headingAccent": "Caring for every step.",
      "intro": "Nemo is a medical platform for doctors, mothers, and parents alike. Follow your child's growth through growth charts and developmental milestones, together in one caring space.",
      "milestones": "Developmental milestones",
      "careNote": "For the little moments. And the big milestones.",
      "track": "Track your child's growth",
      "imageAlt": "Flat illustration of a friendly doctor with a mother, father, and happy baby, alongside a three-dot speech bubble",
      "together": "Growing with care, together",
      "swipe": "Swipe up. Their journey starts here.",
      "swipeHint": "Swipe, scroll here, or click to choose your portal",
      "choose": "Let's get you to the right place",
      "parent": "Parent",
      "doctor": "Doctor"
    },
    "choosePortal": "Choose Your Portal",
    "portals": {
      "title": "Choose Your Portal",
      "description": "A connected space for families and healthcare professionals.",
      "family": "Family Portal",
      "familyDescription": "Follow your children's health, growth, vaccinations, and medical appointments.",
      "clinical": "Healthcare Portal",
      "clinicalDescription": "For doctors and nurses supporting children's health and care.",
      "continue": "Continue to Sign In",
      "accountNotice": "Both portals use unified sign-in. Your authenticated account determines your dashboard and permissions."
    },
    "services": {
      "records": {
        "title": "Your Child's Complete Medical Record",
        "description": "Access your child's health information in one place, including medical visits, diagnoses, prescriptions, and notes recorded by healthcare providers.",
        "alt": "Healthcare professional using a tablet in a clinical workspace"
      },
      "vaccinations": {
        "title": "Simple Vaccination Tracking",
        "description": "View your child's vaccination schedule and keep track of completed doses and upcoming vaccination appointments.",
        "alt": "Vaccination vials and a syringe on a clean, light surface"
      },
      "growth": {
        "title": "Every Stage of Growth Matters",
        "description": "Monitor height, weight, and head circumference through growth charts, and explore developmental milestones appropriate for your child's age.",
        "alt": "Doctor examining a child during a pediatric consultation"
      },
      "appointments": {
        "title": "Organized Care and Easier Appointments",
        "description": "Request medical appointments for your child, track requests as doctors review and approve or reject them, and view scheduled follow-up visits.",
        "alt": "Bright clinic examination room with a bed and organized medical supplies"
      }
    },
    "signIn": "Sign In to nomu",
    "explore": "Explore our platform",
    "hospitalAlt": "Hospital exterior with modern windows and an outdoor seating area",
    "clinicAlt": "Bright examination room with a medical supply cabinet and examination bed",
    "vaccinationAlt": "Vaccine vials and a syringe on a light surface",
    "photoCaption": "A connected approach to children's health",
    "careEyebrow": "CARE THAT GROWS WITH THEM",
    "careTitle": "One place for every stage of care",
    "careIntro": "From everyday follow-ups to important milestones, keep your child's health journey connected and organized.",
    "recordsTitle": "A clearer picture of their health",
    "recordsDescription": "Bring medical records and prescriptions together to support conversations with your healthcare team.",
    "preventionTitle": "Stay connected to preventive care",
    "preventionDescription": "Review vaccinations and medical appointments alongside your child's health information.",
    "developmentTitle": "Follow every stage of growth",
    "developmentDescription": "View growth charts and developmental milestones as your child learns, changes, and grows.",
    "portalLabel": "CHILDREN?S HEALTH & DEVELOPMENT",
    "backWelcome": "Back to Welcome",
    "swipeUp": "Swipe Up to Choose Your Portal",
    "care": "Integrated Care",
    "records": "Medical Records",
    "growth": "Growth Monitoring",
    "description": "nomu is an integrated digital healthcare platform that brings children's health information together in one place, helping parents and healthcare providers manage medical records, vaccinations, growth charts, developmental milestones, and medical appointments.",
    "getStarted": "Get Started",
    "signInPending": "Unified sign-in is being prepared. Please check back soon.",
    "brandHome": "nomu | نمو home",
    "heroHeading": "Your Child's Growth, Our Care",
    "heroSubtitle": "Comprehensive Healthcare for Every Stage of Your Child's Growth",
    "continueMother": "Continue as Mother",
    "continueDoctor": "Continue as Doctor",
    "pauseVideo": "Pause background video",
    "playVideo": "Play background video"
  },
  "common": {
    "home": "Home",
    "back": "Back",
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading…",
    "search": "Search",
    "logout": "Log out",
    "language": "Language"
  },
  "navigation": {
    "motherDashboard": "Mother Dashboard",
    "doctorDashboard": "Doctor Dashboard",
    "medicalRecord": "Medical Record",
    "growthCharts": "Growth Charts",
    "vaccinations": "Vaccinations",
    "milestones": "Developmental Milestones",
    "prescriptions": "Prescriptions",
    "appointments": "Appointments",
    "aiAssistant": "AI Assistant"
  },
  "auth": {
    "demoInvalidCredentials": "Incorrect National ID or password. Please use the demo credentials.",
    "nationalIdPlaceholder": "Enter your National ID",
    "passwordPlaceholder": "Enter your password",
    "nationalIdRequired": "Please enter your National ID.",
    "passwordRequired": "Please enter your password.",
    "loginDemoStatus": "Login authentication will be available soon.",
    "fullName": "Full Name",
    "emailAddress": "Email Address",
    "motherLogin": "Mother Login",
    "doctorLogin": "Doctor Login",
    "motherRegister": "Mother Registration",
    "nationalId": "National ID",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "signIn": "Login",
    "createAccount": "Create an Account",
    "forgotPassword": "Forgot password?",
    "welcomeBack": "Welcome Back!",
    "requiredField": "This field is required.",
    "showPassword": "Show password",
    "hidePassword": "Hide password",
    "show": "Show",
    "hide": "Hide"
  },
  "mother": {
    "notifications": {
      "bell": "Notifications",
      "title": "Notifications",
      "close": "Close notifications",
      "markAll": "Mark All as Read",
      "empty": "No notifications yet.",
      "read": "Read",
      "unread": "Unread",
      "created": "Created",
      "appointmentTime": "Appointment",
      "storageError": "Notifications could not be loaded or saved. Please check browser storage.",
      "timingNote": "Reminders update while this website is open or when you return. No email is sent.",
      "bookingSubmittedTitle": "Booking request submitted",
      "bookingSubmittedDescription": "Your request is pending doctor approval. The appointment is not confirmed.",
      "rescheduleSubmittedTitle": "Reschedule request submitted",
      "rescheduleSubmittedDescription": "Your original appointment remains confirmed until the doctor approves the change.",
      "reminder24hTitle": "Appointment within 24 hours",
      "reminder24hDescription": "Your confirmed appointment is coming up within 24 hours.",
      "reminder2hTitle": "Appointment within 2 hours",
      "reminder2hDescription": "Your confirmed appointment is coming up within 2 hours.",
      "bookingApprovedTitle": "Booking approved",
      "bookingApprovedDescription": "The doctor approved your appointment request.",
      "bookingRejectedTitle": "Booking rejected",
      "bookingRejectedDescription": "The doctor rejected your appointment request.",
      "rescheduleApprovedTitle": "Rescheduling approved",
      "rescheduleApprovedDescription": "The doctor approved the proposed appointment change.",
      "rescheduleRejectedTitle": "Rescheduling rejected",
      "rescheduleRejectedDescription": "The doctor rejected the proposed appointment change."
    },
    "reschedule": {
      "title": "Reschedule Appointment",
      "button": "Reschedule",
      "original": "Original confirmed appointment",
      "originalTime": "Original date and time",
      "requestedTime": "Requested new date and time",
      "rule": "Rescheduling requires at least 24 hours before the original appointment. The new slot must also be at least 24 hours from now.",
      "approvalNote": "The original appointment remains confirmed at its original time until the doctor approves this request.",
      "submit": "Submit reschedule request",
      "success": "Reschedule request saved. Your original appointment remains confirmed and unchanged until the doctor approves the change.",
      "status": "Reschedule Pending",
      "requestType": "Reschedule request",
      "bookingType": "Booking request",
      "ineligible": "This appointment is not eligible for rescheduling. It must be confirmed and at least 24 hours away.",
      "alreadyPending": "A reschedule request is already pending for this appointment.",
      "invalidSlot": "Choose an available new slot at least 24 hours from now, different from the original appointment.",
      "duplicateRequest": "This slot conflicts with an existing appointment or pending request. Choose another slot.",
      "notFound": "Appointment unavailable or not linked to this mother.",
      "storageError": "Demo requests could not be read or saved. Check browser storage and try again.",
      "demoNotice": "Frontend demo only. Browser storage is not secure authorization and does not synchronize availability across users or devices."
    },
    "doctorOmar": "Dr. Omar Haddad",
    "booking": {
      "back": "Back to Appointments",
      "demoNotice": "Demo booking only. Fictional slots are not real doctor availability. Requests are stored in this browser for the demo mother; this is not secure server-side authorization.",
      "child": "Child",
      "chooseChild": "Select a child",
      "noChildren": "No linked children are available.",
      "doctor": "Select doctor",
      "generalPediatrics": "General Pediatrics",
      "pediatricCare": "Pediatric Care",
      "pediatricDevelopment": "Pediatric Growth and Development",
      "availability": "Demo dates and times",
      "date": "Appointment date",
      "time": "Appointment time",
      "availabilityHint": "Select an available date in the next 30 days, then select a time. Only this doctor's bookable demo slots are shown.",
      "noDates": "No demo dates with available times in the next 30 days.",
      "noSlots": "No demo slots are available on this date. Choose another date.",
      "available": "Available",
      "unavailable": "Unavailable",
      "selected": "Selected",
      "reason": "Reason for visit (required)",
      "summary": "Booking summary",
      "notSelected": "Not selected",
      "approvalNote": "Your request will be Pending until the doctor approves it.",
      "submit": "Submit booking request",
      "success": "Your demo request was saved as Pending. Doctor approval is required; the appointment is not confirmed.",
      "invalidBooking": "Select a linked child, doctor, available future date and time, and enter a reason (up to 1,000 characters).",
      "duplicateRequest": "A pending request already exists for this doctor, date, and time. Choose another slot.",
      "storageError": "Demo requests could not be read or saved. Check browser storage and try again; no booking has been confirmed."
    },
    "appointmentsPage": {
      "bookingCardTitle": "Book Your Appointment Here",
      "title": "My Appointments",
      "bookAppointment": "Book Appointment",
      "bookingUnavailable": "Appointment booking will be available in the next step.",
      "demoNotice": "Demo appointments for preview only. These are not live bookings.",
      "appointmentGroups": "Appointment categories",
      "upcoming": "Upcoming Appointments",
      "pending": "Pending Requests",
      "past": "Past Appointments",
      "doctor": "Doctor",
      "date": "Date",
      "time": "Time",
      "reason": "Reason for visit",
      "confirmed": "Confirmed",
      "pendingStatus": "Pending",
      "completed": "Completed",
      "empty": "No appointments in this category.",
      "routineCheckup": "Routine pediatric check-up",
      "skinFollowUp": "Follow-up for skin irritation",
      "generalConsultation": "General pediatric consultation",
      "skinConsultation": "Consultation for skin irritation"
    },
    "registration": {
      "title": "Create Your Account",
      "subtitle": "Join nomu and start your child's health journey.",
      "headlineFirst": "Create your account",
      "headlineSecond": "and start your child's",
      "headlineAccent": "health journey.",
      "description": "Join nomu to easily manage your children's health, track their growth, vaccinations, and developmental milestones.",
      "growthDescription": "Track your child's growth and health progress.",
      "vaccinationDescription": "Keep up with the recommended vaccination schedule.",
      "milestoneDescription": "Support your child's development every step of the way.",
      "fullNamePlaceholder": "Enter your full name",
      "emailPlaceholder": "Enter your email address",
      "nationalIdPlaceholder": "Enter your National ID",
      "passwordPlaceholder": "Create a password (min. 8 characters)",
      "confirmPasswordPlaceholder": "Confirm your password",
      "fullNameRequired": "Please enter your full name.",
      "emailRequired": "Please enter your email address.",
      "nationalIdRequired": "Please enter your National ID.",
      "passwordRequired": "Please create a password.",
      "confirmPasswordRequired": "Please confirm your password.",
      "emailInvalid": "Please enter a valid email address.",
      "passwordShort": "Your password must contain at least 8 characters.",
      "passwordMismatch": "Your passwords do not match.",
      "showConfirmPassword": "Show confirm password",
      "hideConfirmPassword": "Hide confirm password",
      "haveAccount": "Already have an account?",
      "backHome": "Back to Home",
      "demoMessage": "Registration will be available when the backend is connected."
    },
    "recovery": {
      "unavailableShort": "Code verification and password reset are not available yet.",
      "forgotTitle": "Forgot Password?",
      "subtitle": "Enter your email.",
      "codeDigit": "Digit",
      "progress": "Password recovery progress",
      "verifyTitle": "Verify Code",
      "newTitle": "New Password",
      "codeLabel": "Six-digit verification code",
      "sendCode": "Send Code",
      "verify": "Verify",
      "resend": "Resend Code",
      "reset": "Reset Password",
      "back": "Back to Login",
      "success": "Password updated.",
      "unavailable": "Email delivery, code verification, and password reset are not yet available. No email will be sent and your password will not change.",
      "emailInvalid": "Please enter a valid email address.",
      "codeInvalid": "Enter the six-digit verification code.",
      "passwordHint": "Use at least 8 characters.",
      "passwordShort": "Your password must contain at least 8 characters.",
      "confirmRequired": "Please confirm your password.",
      "passwordMismatch": "Your passwords do not match.",
      "restart": "Please start again from Forgot Password.",
      "requestFailed": "Unable to complete this request. Please try again later.",
      "resent": "A new code has been requested."
    },
    "brandHome": "nomu | نمو home",
    "welcomeBack": "Welcome Back, Mom!",
    "loginBrandCaption": "Pediatric Care for a Brighter Tomorrow",
    "loginCardSubtitle": "Sign in to access your children’s health information.",
    "loginRememberMe": "Remember me",
    "loginSignIn": "Sign In",
    "loginOr": "or",
    "loginCreateAccount": "Create a New Account",
    "demoNote": "This login is currently a frontend demo.",
    "childOverview": "Overview",
    "followUpVisits": "Follow-up Visits",
    "growthChart": "Growth Chart",
    "milestones": "Milestones",
    "age": "Age",
    "lastVisit": "Last medical visit",
    "lastDoctor": "Last doctor",
    "childNotFound": "Child not found",
    "sectionNotFound": "Section not found",
    "backToChildren": "Back to My Children",
    "childBreadcrumb": "Child page location",
    "medicalNavigation": "Child medical navigation",
    "selectedChild": "Selected Child",
    "upcomingVisits": "Upcoming follow-up visits",
    "previousVisits": "Previous follow-up visits",
    "doctorEnteredReadOnly": "Demo information entered by the doctor. View only.",
    "diagnosis": "Diagnosis",
    "clinicalNotes": "Clinical notes",
    "medication": "Medication",
    "doctorInstructions": "Doctor's instructions",
    "futureSectionPlaceholder": "This section will be available in a future update.",
    "adamDiagnosis": "Mild nasal congestion",
    "adamNotes": "Child was examined during the last visit. A follow-up was recorded by the doctor.",
    "linaDiagnosis": "Mild skin irritation",
    "linaNotes": "Skin was examined during the last visit. A follow-up was recorded by the doctor.",
    "adamMedication": "Saline nasal drops (demo prescription)",
    "adamInstructions": "See the doctor's recorded prescription instructions. This is simulated data only.",
    "linaMedication": "Fragrance-free emollient (demo prescription)",
    "linaInstructions": "See the doctor's recorded prescription instructions. This is simulated data only.",
    "dashboardEyebrow": "MOTHER DASHBOARD",
    "welcome": "Welcome back, Sara!",
    "welcomeSubtitle": "Manage your children's healthcare journey in one place.",
    "illustrationAlt": "A mother embracing her child",
    "myChildren": "My Children",
    "viewAll": "View All",
    "viewChildDetails": "View Child Details",
    "upcomingAppointments": "Upcoming Follow-up Appointments",
    "followUpVisit": "Follow-up Visit",
    "pediatrician": "Pediatrician",
    "viewDetails": "View Details",
    "destinationUnavailable": "This destination is not available yet",
    "navigationLabel": "Mother navigation",
    "profile": "Profile",
    "settings": "Settings",
    "logout": "Logout",
    "portal": "Mother Portal",
    "sara": "Sara Ahmad",
    "adam": "Adam Ahmad",
    "lina": "Lina Ahmad",
    "twoYearsOld": "2 years old",
    "oneYearOld": "1 year old",
    "male": "Male",
    "female": "Female",
    "doctorAhmad": "Dr. Ahmad Khalil",
    "doctorRania": "Dr. Rania Saleh"
  },
  "doctor": {
    "login": {
      "headlineFirst": "Your patients'",
      "headlineHealth": "health",
      "headlinePunctuation": ",",
      "headlineLast": "all in one place.",
      "brandHome": "nomu | نمو home",
      "brandCaption": "Pediatric Care for a Brighter Tomorrow",
      "welcome": "Welcome Back,",
      "doctor": "Doctor!",
      "description": "Your patients' health records, all in one place.",
      "recordsTitle": "Electronic Medical Records",
      "recordsDescription": "Access and update your patients' medical information easily.",
      "growthTitle": "Patient Growth Monitoring",
      "growthDescription": "Track growth charts and developmental milestones.",
      "followUpTitle": "Follow-up Management",
      "followUpDescription": "Schedule and manage follow-up visits for your patients.",
      "title": "Doctor Sign In",
      "subtitle": "Access your patient records securely.",
      "passwordPlaceholder": "Enter your password",
      "passwordRequired": "Please enter your password.",
      "signIn": "Sign In",
      "backHome": "Back to Home",
      "doctorId": "Doctor ID",
      "doctorIdPlaceholder": "Enter your Doctor ID",
      "doctorIdRequired": "Please enter your Doctor ID."
},
    "patients": "Patients",
    "patientDetails": "Patient Details",
    "clinicalNotes": "Clinical Notes",
    "calendar": "Calendar",
    "profile": "Profile",
    "sidebar": "Doctor sidebar",
    "dashboardNavigation": "Dashboard navigation",
    "brandLabel": "nomu doctor dashboard",
    "tagline": "Growing Healthier Futures",
    "toggleSidebar": "Toggle sidebar",
    "viewNotifications": "View notifications",
    "welcome": "Welcome back, {name}!",
    "welcomeSubtitle": "Here is your patient list. You can search for a child and add them to your list.",
    "pediatrician": "Pediatrician",
    "patientSummary": "Patient summary",
    "totalPatients": "Total Patients",
    "todayVisits": "Today's Visits",
    "upcomingFollowUps": "Upcoming Follow Ups",
    "addExistingPatient": "Add Existing Patient",
    "addCardSubtitle": "Search and add a child to your list",
    "patientAdded": "{name} was added to your patient list.",
    "dismissMessage": "Dismiss message",
    "searchAndFilter": "Search and filter patients",
    "searchPatients": "Search patients",
    "searchPlaceholder": "Search by child name, national ID, or medical file number...",
    "ageGroup": "Age Group",
    "all": "All",
    "infant": "Under 1 year",
    "toddler": "1–2 years",
    "child": "2–3 years",
    "gender": "Gender",
    "female": "Female",
    "male": "Male",
    "nextFollowUp": "Next Follow Up",
    "upcoming": "Upcoming",
    "overdue": "Overdue",
    "noFollowUp": "No Follow-up",
    "clearFilters": "Clear Filters",
    "demoNote": "Frontend demonstration · Fictional patient data · Dates use your device’s local day",
    "recordTitle": "Medical record selected",
    "profileTitle": "Doctor profile",
    "logoutTitle": "Logout unavailable in this demo",
    "notifications": "Notifications",
    "selectedPatientId": "Selected patient ID",
    "recordPlaceholder": "The medical record page is not built yet. This selection is ready to connect to a future patient record route.",
    "calendarPlaceholder": "The calendar page will be implemented in a later step.",
    "demoProfile": "Demo doctor profile",
    "logoutPlaceholder": "This frontend demonstration has no authentication session to end.",
    "noNotifications": "No new notifications in this demonstration.",
    "assignedPatients": "Assigned patients",
    "tableRegion": "Patient table; scroll horizontally on small screens",
    "tableCaption": "Your assigned pediatric patients",
    "number": "#",
    "childName": "Child Name",
    "age": "Age",
    "medicalFile": "Medical File No.",
    "lastVisit": "Last Visit",
    "actions": "Actions",
    "viewRecord": "View Record",
    "noPatients": "No patients found",
    "emptyHint": "Try another search or clear your filters.",
    "showing": "Showing {from} – {to} of {total} patients",
    "pagination": "Patient list pagination",
    "previousPage": "Previous page",
    "nextPage": "Next page",
    "page": "Page {number}",
    "selectChild": "Select an existing child first.",
    "alreadyAddedError": "This child is already in your patient list.",
    "addDescription": "Search for a registered child and select them to add to your patient list.",
    "searchRegistered": "Search registered children",
    "registeredPlaceholder": "Child name, national ID, or medical file number",
    "matchingRecords": "Matching fictional records",
    "alreadyAdded": "Already added",
    "noRegisteredMatches": "No registered children match your search.",
    "addPatient": "Add Patient",
    "closeDialog": "Close dialog",
    "booking": {
      "noRequestsYet": "No appointment requests yet.",
      "shortDemoNotice": "Demo · Saved in this browser only · Times in Asia/Amman.",
      "title": "Calendar & Appointments",
      "subtitle": "Manage your availability and review appointment requests from parents.",
      "availability": "My Availability",
      "requests": "Appointment Requests",
      "availabilityDescription": "Set weekly working hours, appointment duration, and workplace.",
      "workplace": "Workplace",
      "clinic": "Clinic",
      "hospital": "Hospital",
      "location": "Workplace name / location (optional)",
      "duration": "Appointment Duration",
      "minutes": "minutes",
      "weeklySchedule": "Weekly Schedule",
      "workingDay": "Working day",
      "start": "Start time",
      "end": "End time",
      "addInterval": "Add Time Interval",
      "removeInterval": "Remove interval",
      "saveAvailability": "Save Availability",
      "exceptions": "Exceptions / Unavailable Dates",
      "exceptionsDescription": "Close a specific date without changing your recurring weekly schedule.",
      "optionalReason": "Reason (optional)",
      "date": "Date",
      "time": "Time",
      "addException": "Add Unavailable Date",
      "removeException": "Remove unavailable date",
      "noExceptions": "No unavailable dates added.",
      "saveReminder": "Save Availability to apply exception changes.",
      "slotPreview": "Available Slot Preview",
      "previewDescription": "Slots use your saved schedule and exclude reserved times. Save changes before previewing.",
      "noSlots": "No available slots for this date.",
      "receiveDemo": "Receive a fictional demo request",
      "demoReason": "Fictional demo appointment request",
      "demoNotice": "Frontend demo with fictional data only. Browser storage is local to this browser; there are no live messages or cross-user synchronization.",
      "zone": "All booking dates and times use Asia/Amman.",
      "requestsDescription": "Review requests, confirm approvals, or reject with a reason.",
      "filterRequests": "Filter appointment requests",
      "all": "All",
      "pending": "Pending",
      "approved": "Approved",
      "rejected": "Rejected",
      "cancelled": "Cancelled",
      "reason": "Reason for visit",
      "status": "Status",
      "approve": "Approve",
      "reject": "Reject",
      "viewDetails": "View Details",
      "requestDetails": "Appointment Request Details",
      "confirmApproval": "Approve Appointment",
      "confirmRejection": "Reject Appointment",
      "approveWarning": "Confirm approval of this appointment. Availability and booking conflicts will be checked again.",
      "rejectWarning": "Enter a reason and confirm rejection. The reserved slot will be released.",
      "confirmApprove": "Confirm Approval",
      "confirmReject": "Confirm Rejection",
      "rejectionReason": "Rejection Reason",
      "decisionTime": "Decision Date / Time",
      "close": "Close",
      "emptyRequests": "No appointment requests in this category.",
      "availabilitySaved": "Availability saved successfully.",
      "approvedSuccess": "Appointment approved successfully.",
      "rejectedSuccess": "Appointment rejected. Its slot is available again.",
      "requestReceived": "Fictional request received with Pending status.",
      "invalidSchedule": "Please check the workplace, duration, and weekly schedule.",
      "intervalRequired": "Add at least one time interval for every enabled working day.",
      "invalidRange": "Each interval needs a valid start time earlier than its end time.",
      "overlap": "Time intervals on the same day must not overlap.",
      "invalidException": "Choose a valid date from today onwards that is not already listed.",
      "availabilityConflict": "These changes conflict with reserved appointments. Review the listed requests and resolve the conflict before saving. Pending requests can be rejected; approved bookings require a coordinated cancellation/rescheduling process. No booking has been changed.",
      "requestRequired": "A doctor, child, slot, and visit reason are required.",
      "duplicateRequest": "This request has already been submitted.",
      "slotUnavailable": "This slot is no longer available. Refresh the slot preview and choose another time.",
      "alreadyDecided": "This request has already been decided or is unavailable.",
      "rejectionRequired": "Please enter a rejection reason.",
      "bookingConflict": "Cannot approve: the time is past, outside availability, or conflicts with another reservation.",
      "storageUnavailable": "Browser storage is unavailable. This change was not saved. Please retry when storage is available.",
      "invalidStorage": "Saved booking data is invalid and has been preserved without overwriting. Restore a valid demo backup before saving changes.",
      "staleStorage": "Booking data changed in another tab. Refresh before trying again.",
      "notification": "A mother requested an appointment for this child.",
      "pendingCount": "Pending requests",
      "openRequest": "Open Request"
},
    "clinicalAssessment": {
      "voidAction": "Void Assessment",
      "voidTitle": "Void Clinical Assessment",
      "active": "Active",
      "voided": "Voided",
      "status": "Status",
      "voidReason": "Reason for Voiding",
      "voidWarning": "This assessment will be marked as voided, not permanently deleted. Its original clinical information will remain in history.",
      "confirmVoid": "Confirm Void",
      "voidReasonRequired": "Please enter a reason for voiding the assessment.",
      "voidError": "Unable to void this assessment. Your reason has been kept.",
      "voidSuccess": "Assessment marked as voided successfully.",
      "voidedAt": "Voided Date / Time",
      "voidedBy": "Voided By",
      "title": "Add Clinical Assessment",
      "editTitle": "Edit Clinical Assessment",
      "description": "Record examination findings, clinical impressions, and recommendations for this child.",
      "date": "Assessment Date",
      "type": "Assessment Type (optional)",
      "selectType": "Select assessment type",
      "findings": "Clinical Findings",
      "diagnosis": "Diagnosis / Clinical Impression",
      "plan": "Recommendations / Plan",
      "findingsPlaceholder": "Enter clinical examination findings",
      "diagnosisPlaceholder": "Enter diagnosis or clinical impression",
      "planPlaceholder": "Enter recommendations or follow-up plan",
      "types": {
            "routine": "Routine Check-up",
            "followup": "Follow-up Assessment",
            "general": "General Clinical Assessment",
            "other": "Other"
      },
      "save": "Save Assessment",
      "update": "Update Assessment",
      "history": "Clinical Assessment History",
      "historyDescription": "Previously recorded assessments for this child, newest first.",
      "empty": "No clinical assessments recorded yet.",
      "actions": "Actions",
      "view": "View Details",
      "edit": "Edit",
      "details": "Clinical Assessment Details",
      "doctor": "Doctor",
      "close": "Close",
      "notRecorded": "Not recorded",
      "dateRequired": "Please select an assessment date.",
      "dateRange": "Choose a date between birth and today.",
      "findingsRequired": "Please enter the clinical findings.",
      "diagnosisRequired": "Please enter a diagnosis or clinical impression.",
      "invalidType": "Please select a valid assessment type.",
      "saved": "Assessment saved successfully.",
      "updated": "Assessment updated successfully.",
      "saveError": "Unable to save the assessment. Your entries have been kept.",
      "demo": "Fictional demo only. Assessments are stored temporarily in this browser. Do not enter real medical information. A backend will provide persistence and doctor authorization.",
      "storageUnavailable": "Browser storage is unavailable. Assessments may not survive refresh.",
      "invalidStorage": "Some stored assessment data could not be loaded safely."
},
    "notesDiagnosis": {
      "edit": "Edit Note",
      "update": "Update Note",
      "updatedSuccess": "The note was updated successfully.",
      "title": "Medical Notes & Diagnosis",
      "description": "Clinical notes, diagnoses and observations from visits and standalone records.",
      "add": "Add New Note / Diagnosis",
      "type": "Note Type",
      "date": "Visit Date",
      "doctor": "Doctor",
      "types": { "diagnosis": "Diagnosis", "observation": "Clinical Observation", "followup": "Follow-up Note" },
      "chooseType": "Select note type",
      "diagnosis": "Diagnosis",
      "observations": "Clinical Observations / Medical Notes",
      "plan": "Follow-up Plan / Recommendations",
      "diagnosisPlaceholder": "Enter the diagnosis...",
      "observationsPlaceholder": "Enter clinical observations and notes...",
      "planPlaceholder": "Enter the follow-up plan or recommendations...",
      "optional": "optional",
      "linkedVisit": "Linked Medical Visit",
      "noVisitLink": "No linked visit",
      "visitUnavailable": "Visit details are unavailable in this session",
      "visitSource": "Medical visit",
      "standaloneSource": "Standalone note",
      "filters": "Filter medical notes",
      "filtersLabel": { "all": "All Notes", "diagnosis": "Diagnoses", "observation": "Clinical Observations", "followup": "Follow-up Notes" },
      "emptyTitle": "No medical notes or diagnoses yet",
      "emptyFilter": "No notes match this filter",
      "emptyDescription": "Available visit notes and newly added standalone notes will appear here.",
      "noObservations": "No clinical observations recorded.",
      "notRecorded": "Not recorded",
      "viewDetails": "View Details",
      "detailsTitle": "Medical Note Details",
      "save": "Save Note",
      "saving": "Saving…",
      "success": "The note was saved successfully.",
      "saveError": "The note could not be saved. Please check the selected child and visit.",
      "typeRequired": "Please select a note type.",
      "dateRequired": "Please enter a valid visit date.",
      "dateRange": "The visit date must be between the child's birth date and today.",
      "diagnosisRequired": "Please enter a diagnosis for a diagnosis note.",
      "observationsRequired": "Please enter clinical observations for an observation note.",
      "invalidVisit": "Please select a visit belonging to this child.",
      "invalidStorage": "Some saved demo notes were invalid and could not be loaded. Valid notes were retained.",
      "storageUnavailable": "Browser storage is unavailable. New notes are kept in memory only and may be lost after refresh.",
      "mockNotice": "Standalone fictional notes use temporary browser storage. Do not enter real patient or medical information. Visit-linked entries are derived from visits, which reset after refresh."
    },
    "followUp": {
      "appointments": "Follow-up Appointments",
      "newAppointment": "New Follow-up",
      "upcoming": "Upcoming",
      "past": "Past",
      "missed": "Missed (recorded attendance)",
      "cancelled": "Cancelled",
      "editReschedule": "Edit / Reschedule",
      "cancelAppointment": "Cancel Appointment",
      "cancelledSuccess": "The appointment was cancelled. Its history has been retained.",
      "actionError": "This appointment can no longer be changed. Please check its current status.",
      "empty": "No follow-up appointments have been recorded for this child.",
      "timeLabel": "Time",
      "reasonLabel": "Reason for Follow-up",
      "instructionsLabel": "Additional Instructions",
      "noTime": "Time not specified",
      "notProvided": "Not provided",
      "statuses": { "scheduled": "Scheduled", "cancelled": "Cancelled", "completed": "Completed", "missed": "Missed — recorded attendance" },
      "invalidStorage": "Some saved demo appointment data was invalid and could not be loaded. Valid records were retained.",
      "storageUnavailable": "Browser storage is unavailable. Appointment changes are kept in memory only and may be lost after refresh.",
      "title": "Set Next Follow-up Date",
      "date": "Next Follow-up Date",
      "time": "Follow-up Time (optional)",
      "reason": "Reason for Follow-up (optional)",
      "instructions": "Additional Instructions (optional)",
      "reasonPlaceholder": "Enter the reason for follow-up...",
      "instructionsPlaceholder": "Enter additional instructions...",
      "current": "Current follow-up",
      "save": "Save Follow-up",
      "saving": "Saving…",
      "dateRequired": "Please select a valid follow-up date.",
      "pastDate": "Please select today or a future date to schedule or reschedule a follow-up.",
      "invalidTime": "Please enter a valid follow-up time.",
      "saveError": "The follow-up could not be saved. Please try again.",
      "success": "The child's follow-up was saved successfully.",
      "mockNotice": "Fictional demo appointments are saved in this browser's localStorage. Do not enter real patient or medical information. This is temporary demo storage, not a medical backend."
    },
    "prescription": {
      "strengthLabel": "Strength / Concentration",
      "instructionsLabel": "Special Instructions / Notes",
      "requiredFields": {
        "medication": "Please enter the medication name.",
        "dosage": "Please enter the prescribed amount and unit.",
        "frequency": "Please enter the prescribed frequency.",
        "duration": "Please enter the prescribed duration.",
        "route": "Please select the route of administration."
      },
      "title": "Prescriptions",
      "subtitle": "Medications recorded for this child.",
      "add": "Add New Prescription",
      "medication": "Medication Name",
      "strength": "Medication Strength / Concentration (optional)",
      "dosage": "Dosage",
      "frequency": "Frequency",
      "duration": "Duration",
      "route": "Route of Administration",
      "instructions": "Special Instructions / Notes (optional)",
      "medicationPlaceholder": "Enter medication name...",
      "strengthPlaceholder": "Enter strength or concentration...",
      "dosagePlaceholder": "Enter prescribed amount and unit",
      "frequencyPlaceholder": "Enter prescribed frequency",
      "durationPlaceholder": "Enter prescribed duration",
      "instructionsPlaceholder": "Enter special instructions or notes...",
      "dosageHelp": "Include the amount and unit as prescribed by the doctor.",
      "chooseRoute": "Select route",
      "routes": { "oral": "Oral", "topical": "Topical", "inhaled": "Inhaled", "eye": "Ophthalmic (eye)", "ear": "Otic (ear)", "nasal": "Nasal", "rectal": "Rectal", "injection": "Injection", "other": "Other" },
      "save": "Save Prescription",
      "saving": "Saving…",
      "required": "This field is required.",
      "routeRequired": "Select a valid route of administration.",
      "success": "The prescription was saved successfully.",
      "saveError": "The prescription could not be saved. Please try again.",
      "datePrescribed": "Date Prescribed",
      "doctor": "Prescribing Doctor",
      "viewDetails": "View Details",
      "detailsTitle": "Prescription Details",
      "emptyTitle": "No prescriptions yet",
      "emptyDescription": "Prescriptions added for this child will appear here.",
      "mockNotice": "Demo prescriptions remain available during in-app navigation and reset after refreshing the page."
    },
    "newVisit": {
      "doctorLabel": "Doctor",
      "add": "Add New Visit",
      "title": "Add New Medical Visit",
      "date": "Visit Date",
      "type": "Visit Type",
      "chooseType": "Select visit type",
      "types": { "routine": "Routine Check-up", "followup": "Follow-up", "sick": "Sick Visit", "other": "Other" },
      "chiefComplaint": "Chief Complaint / Reason for Visit",
      "chiefComplaintPlaceholder": "Enter the reason for this visit...",
      "diagnosis": "Diagnosis",
      "diagnosisPlaceholder": "Enter diagnosis...",
      "observations": "Clinical Observations / Medical Notes",
      "observationsPlaceholder": "Write clinical observations and notes...",
      "treatment": "Treatment Recommendations",
      "treatmentPlaceholder": "Enter treatment recommendations...",
      "nextFollowUp": "Next Follow-up Date",
      "optional": "Optional; leave blank to keep the existing follow-up plan.",
      "save": "Save Visit",
      "saving": "Saving…",
      "success": "The medical visit was saved successfully.",
      "mockNotice": "Demo visit records and their clinical text are saved locally in this browser and remain available after refresh. Do not enter real patient or medical information.",
      "dateRequired": "Enter a valid visit date.",
      "typeRequired": "Select a visit type.",
      "futureVisit": "A medical visit cannot be dated in the future.",
      "beforeBirth": "The visit date cannot be before the child's date of birth.",
      "followupBeforeVisit": "The follow-up date must be on or after the visit date.",
      "saveError": "The visit could not be saved. Please try again.",
      "history": "Medical Visit History",
      "emptyHistory": "No new visits have been recorded in this demo session."
    },
    "patientRecordNav": {
      "title": "Patient Record",
      "visits": "Medical Visits",
      "clinical": "Clinical Assessments",
      "notes": "Medical Notes & Diagnoses",
      "prescriptions": "Prescriptions",
      "followup": "Follow-up Appointments",
      "growth": "Growth Data",
      "vaccinations": "Vaccinations",
      "milestones": "Developmental Milestones"
    },
    "medicalRecord": {
      "quickActions": "Quick Actions",
      "backToRecord": "Back to Medical Record",
      "quickActionLabels": {
        "growth": "Add / Update Growth Data",
        "vaccinations": "Mark Vaccination",
        "milestones": "View Parents’ Milestone Assessment",
        "clinical": "Add Clinical Assessment",
        "notes": "Add Medical Notes and Diagnosis",
        "prescriptions": "Add Prescriptions",
        "followup": "Set Next Follow-up Date"
      },
      "backToPatients": "Back to Patients",
      "navigation": "Child medical record sections",
      "overviewTitle": "Medical Record",
      "overviewSubtitle": "Overview",
      "growthTitle": "Growth Data",
      "growthSubtitle": "Add / Update",
      "vaccinationsTitle": "Vaccinations",
      "vaccinationsSubtitle": "Mark Vaccination",
      "milestonesTitle": "Milestone Assessment",
      "milestonesSubtitle": "View Parents’ Assessment",
      "clinicalTitle": "Clinical Assessment",
      "clinicalSubtitle": "Add Assessment",
      "notesTitle": "Medical Notes",
      "notesSubtitle": "Add Notes and Diagnosis",
      "prescriptionsTitle": "Prescriptions",
      "prescriptionsSubtitle": "Add Prescriptions",
      "followupTitle": "Next Follow-up",
      "followupSubtitle": "Set Follow-up Date",
      "dateOfBirth": "Date of Birth",
      "medicalSummary": "Medical summary",
      "weight": "Weight",
      "height": "Height",
      "headCircumference": "Head Circumference",
      "kg": "kg",
      "cm": "cm",
      "lastUpdated": "Last updated",
      "notRecorded": "Not recorded",
      "noMeasurement": "No measurement available",
      "doctorNotRecorded": "Doctor not recorded",
      "missedVisits": "Missed Visits",
      "noMissedVisits": "No missed visits",
      "visitHistory": "Recorded missed visits",
      "noVisitHistory": "Visit attendance not recorded",
      "notScheduled": "Not scheduled",
      "followupDetail": "Next follow-up appointment",
      "growthChart": "Growth Chart",
      "measurementType": "Measurement type",
      "noGrowthTitle": "Not enough measurements yet",
      "noGrowthDescription": "At least two dated measurements of the selected type are needed to display a growth chart.",
      "chartDescription": "Recorded measurements over time. Exact dates and values are available in the data table below.",
      "measurementData": "View measurement data",
      "date": "Date",
      "basicInformation": "Basic Information",
      "recentNotes": "Recent Medical Notes",
      "noNotesTitle": "No medical notes yet",
      "noNotesDescription": "Available medical notes will appear here.",
      "comingSoon": "Coming Soon",
      "comingSoonDescription": "This section will be available in a later step. The medical overview is currently read-only."
    }
  },
  "childHealth": {
    "vaccinations": {
      "visitEdit": "Edit Vaccination Visit",
      "visitAdminister": "Mark as Administered",
      "visitSchedule": "Schedule Vaccination Appointment",
      "administrationTime": "Actual Vaccination Time",
      "locationPlaceholder": "Enter the hospital or health center name",
      "appointmentSummaryTitle": "Scheduled Vaccination Appointment",
      "notAdministeredYet": "The vaccines for this visit have not been administered yet.",
      "appointmentSummaryEmpty": "No appointment scheduled",
      "cancelAppointment": "Cancel Appointment",
      "cancelAppointmentConfirm": "Are you sure you want to cancel this vaccination appointment?",
      "appointmentSummaryNoTime": "No appointment time selected.",
      "appointmentDateRequired": "Please enter the appointment date.",
      "appointmentTimeRequired": "Please enter the appointment time.",
      "appointmentDateInvalid": "Please select a valid appointment date that is not in the past.",
      "appointmentTimeInvalid": "Please select a valid appointment time in the future.",
      "vaccinationDateRequired": "Please enter the vaccination date.",
      "invalidAdministrationTime": "Enter a valid vaccination time.",
      "visitConfirmReversal": "This visit is marked as completed. Are you sure you want to change its status to incomplete?",
      "corrections": {
        "edit": "Edit Vaccination",
        "status": "Vaccination Status",
        "completed": "Completed",
        "pending": "Incomplete",
        "administeredAt": "Actual Vaccination Date",
        "administrationLocation": "Vaccination Location",
        "internal": "Inside Hospital",
        "external": "External Facility",
        "facilityName": "Hospital or Health Center Name",
        "informationSource": "Evidence Source",
        "vaccinationCard": "Vaccination Card",
        "parentReport": "Parent Report",
        "medicalDocument": "Medical Document",
        "parentReported": "Parent-reported",
        "notes": "Additional Notes (Optional)",
        "select": "Select an option",
        "unspecified": "Not recorded",
        "sourceNotice": "Recording an evidence source does not mean the information has been independently verified.",
        "confirmReversal": "This dose is recorded as completed. Change it to incomplete? The previous record will remain in the correction history.",
        "success": "Vaccination changes saved successfully.",
        "history": "Correction History",
        "field": "Field",
        "previous": "Previous Value",
        "updated": "Updated Value",
        "required": "Enter a valid actual vaccination date that is not in the future or before the child's birth.",
        "locationRequired": "Please enter the vaccination location.",
        "facilityRequired": "Enter the external hospital or health center name.",
        "sourceRequired": "Select an evidence source for an external vaccination.",
        "recordConflict": "This record changed while you were editing. Close and reopen it before trying again.",
        "historicalConflict": "The historical record is ambiguous and needs review before it can be corrected.",
        "correctionForbidden": "Only an authorized doctor can correct vaccination records.",
        "reversalConfirmationRequired": "Confirm changing the completed dose to incomplete.",
        "failed": "Could not save the vaccination changes. Your edits are still available. Please try again."
      },
      "markVisitGiven": "Mark entire visit as administered",
      "visitIncludes": "Vaccines and preventive services included in this visit",
      "conflict": "Historical conflict",
      "historicalReview": "Historical records need review",
      "historicalRecords": "Original individual dose records (read-only)",
      "historicalVisits": "Original visit records (read-only)",
      "historicalConflict": "These historical records cannot safely be represented as one visit: doses may be partially completed, have different administration dates, conflicting appointments, or invalid data. The original records are preserved below. Editing this group is blocked until the source records are reviewed.",
      "legacyVisitNotice": "Original individual dose records are retained below. Consistent historical dates are shown at visit level; saving a pending group explicitly creates one shared visit without deleting the originals.",
      "tableScheduledAge": "Scheduled Age",
      "tableVaccines": "Vaccines",
      "tableStageLabels": {
        "birth": "1st month",
        "month2": "3rd month",
        "month3": "4th month",
        "month4": "5th month",
        "month9": "10th month",
        "month12": "12th month",
        "month18": "18th month"
      },
      "invalidHour": "Enter an hour from 1 to 12.",
      "invalidMinute": "Enter minutes from 00 to 59.",
      "invalidTime": "Enter a valid 24-hour time: HH:MM (00:00–23:59).",
      "information": {
        "title": "Vaccine Information",
        "subtitle": "Learn more about the vaccines in your child's immunization schedule.",
        "hexa": {
          "name": "Hexavalent Vaccine",
          "description": "Protects against diphtheria, tetanus, pertussis, polio, hepatitis B, and Hib disease."
        },
        "bcg": {
          "name": "Tuberculosis Vaccine",
          "description": "Helps protect children against severe forms of tuberculosis."
        },
        "rota": {
          "name": "Rotavirus Vaccine",
          "description": "Helps prevent severe rotavirus gastroenteritis."
        },
        "opv": {
          "name": "Oral Polio Vaccine",
          "description": "Helps protect against poliomyelitis."
        },
        "mmr": {
          "name": "Measles, Mumps, Rubella Vaccine",
          "description": "Protects against measles, mumps, and rubella."
        },
        "dpt": {
          "name": "Diphtheria, Pertussis, Tetanus Vaccine",
          "description": "Protects against diphtheria, pertussis, and tetanus."
        },
        "measles": {
          "name": "Measles Vaccine",
          "description": "Helps protect against measles infection."
        },
        "vitaminA": {
          "name": "Vitamin A",
          "description": "Vitamin A is a preventive nutritional supplement, not a vaccine."
        }
      },
      "newborn": "Newborn",
      "doseLabel": "Dose",
      "editAppointment": "Edit Appointment",
      "stageLabels": {
        "birth": "Within the first month",
        "month2": "Beginning of the third month (age 2 months)",
        "month3": "Beginning of the fourth month (age 3 months)",
        "month4": "Beginning of the fifth month (age 4 months)",
        "month9": "Beginning of the tenth month (age 9 months)",
        "month12": "12 months",
        "month18": "18 months"
      },
      "missingChildId": "A stable child ID is required to save records.",
      "recordConflict": "This record changed while the popup was open. Close and reopen it before applying changes.",
      "rescheduled": "Rescheduled",
      "fulfilled": "Fulfilled",
      "scheduled": "Scheduled",
      "appointmentHistory": "Appointment history",
      "serviceDate": "Service date",
      "iu": "IU",
      "vitaminA": "Vitamin A",
      "booster": "Booster",
      "noChanges": "No changes to save.",
      "partialSave": "Some changes were applied for this session, but others failed. Review the records and retry the remaining changes.",
      "saveChanges": "Save Changes",
      "undoGiven": "Undo",
      "markGiven": "Mark as Given",
      "nextAppointment": "Next appointment",
      "vaccinationDate": "Vaccination date",
      "scheduledAge": "Scheduled age",
      "vaccine": "Vaccine",
      "done": "Done",
      "selectStage": "Select vaccination stage",
      "selectTime": "Select time",
      "selectDate": "Select date",
      "notSpecified": "Not specified",
      "pm": "PM",
      "am": "AM",
      "period": "AM/PM",
      "minute": "Minutes",
      "hour": "Hour",
      "saveAppointment": "Save appointment",
      "stage": "Vaccination stage",
      "time": "Appointment time",
      "appointmentDate": "Appointment date",
      "title": "Vaccinations",
      "subtitle": "Jordan vaccination schedule",
      "schedule": "Immunization schedule",
      "completed": "Completed",
      "due": "Due now",
      "upcoming": "Upcoming",
      "partial": "Partially completed",
      "groups": "age groups",
      "age": "Age",
      "vaccines": "Vaccines",
      "status": "Status",
      "date": "Date",
      "action": "Action",
      "birth": "Birth (within the first month)",
      "months": "months",
      "grade1": "Grade 1",
      "grade10": "Grade 10",
      "combination": "DTaP + IPV + Hib + HepB",
      "rotavirus": "Rotavirus",
      "measles": "Measles",
      "hepatitis": "Hepatitis A",
      "dtapBooster": "DTaP booster",
      "tdBooster": "Td booster",
      "verify": "Verify completion of two MMR doses",
      "dose": "dose",
      "record": "Record dose",
      "view": "View record",
      "followUp": "Next follow-up appointment",
      "note": "Follow-up note",
      "saveFollowUp": "Save follow-up",
      "setBy": "Set by",
      "footer": "Vaccines are updated by the doctor after administration.",
      "administered": "Date administered",
      "batch": "Batch number (optional)",
      "notes": "Notes (optional)",
      "save": "Save",
      "cancel": "Cancel",
      "close": "Close",
      "required": "Choose an available dose and a valid date on or before today and not before birth.",
      "duplicate": "This dose has already been recorded.",
      "failed": "Saving failed. Please try again.",
      "saved": "Vaccination saved.",
      "followUpSaved": "Follow-up saved.",
      "invalidFollowUp": "Choose a valid future appointment date and time, and a vaccination stage.",
      "multipleDates": "Multiple dates",
      "unknownChild": "Child",
      "unknownAge": "Age unavailable",
      "unknownDue": "Due date unavailable",
      "emptyRecords": "No doses recorded in this group.",
      "saving": "Saving…",
      "doctor": "Doctor",
      "noDate": "Not recorded"
    },
    "milestones": {
      "viewStageSkills": "View Skills for This Stage",
      "ageDescriptions": {
        "2": "Your baby begins responding to faces and sounds, smiling, and lifting their head during tummy time.",
        "4": "Your baby becomes more interactive, makes new sounds, and begins reaching for and holding toys.",
        "6": "Your baby explores objects, laughs, recognizes familiar people, and may roll from tummy to back.",
        "9": "Many babies can sit without support, respond to their names, and enjoy interactive games like peekaboo.",
        "12": "Your child begins standing with support, cruising along furniture, and using gestures to communicate.",
        "15": "Your toddler begins taking independent steps, trying simple words, and imitating everyday actions.",
        "18": "Your toddler becomes more independent, walks without support, and follows simple instructions.",
        "24": "Your child begins combining two words, running, exploring different games, and interacting more with others.",
        "30": "Your child uses longer phrases, enjoys pretend play, and begins solving simple problems.",
        "36": "Your child communicates ideas and feelings more clearly, plays with other children, and begins asking questions."
      },
      "manualSave": {
        "button": "Save Answers",
        "saving": "Saving...",
        "saved": "Answers saved successfully.",
        "failed": "Could not save your answers. Please try again.",
        "leaveWarning": "You have unsaved changes. Leave without saving?"
      },
      "parentTips": {
        "title": "Tips for Parents",
        "pace": "Every child develops at their own pace, and some skills may emerge at different ages.",
        "observe": "Observe your child's skills during everyday activities and record notes to discuss with their doctor when needed.",
        "lostSkill": "If your child loses a skill they previously had, consult their doctor.",
        "autosave": "Use Save Answers to save your answers and notes in this browser."
      },
      "stageResponseProgress": "{answered} of {total} skills answered",
      "currentAgeStage": "Current Age Stage",
      "upcomingAgeStage": "Upcoming Age Stage",
      "mediaPlayer": {
      "source": "Source: CDC — cdc.gov/Milestones",
        "volume": "Volume",
        "play": "Play",
        "pause": "Pause",
        "seek": "Video progress",
        "close": "Close media preview",
        "open": "Open media preview",
        "error": "Playback failed. Try Play again."
      },
      "addNote": "+ Add a note",
      "previousAge": "Previous Age",
      "nextAge": "Next Age",
      "ageNavigation": "Milestone age navigation",
      "answeredCount": "{answered} of {total} answered",
      "childAge": "Child's Age",
      "doctorUi": {
        "currentAge": "Current Age",
        "showMore": "Show More",
        "showLess": "Show Less",
        "lastUpdated": "Last updated",
        "noNotes": "No Notes",
        "responseFilter": "Mother's response",
        "allResponses": "All Responses",
        "noFilteredSkills": "No skills match the selected filters. Try clearing the filters.",
        "reviewingAge": "Reviewing Age",
        "subtitle": "Parent-reported developmental observations.",
        "back": "Back to Patient Details",
        "allSkills": "All Skills",
        "totalSkills": "Total Skills",
        "reviewed": "Reviewed",
        "unanswered": "Unanswered",
        "skill": "Milestone Skill",
        "viewMedia": "View Media",
        "clearFilters": "Clear filters"
      },
      "title": "Developmental Milestones",
      "action": "Milestones in Action",
      "subtitle": "Track your child's growth and development step by step.",
      "doctorSubtitle": "Track your patient's growth and development step by step.",
      "description": "Developmental milestones are skills that children learn as they grow, such as how they play, learn, speak, move and interact with others.",
      "banner": "Each age group includes a list of skills that children often develop at that stage.",
      "back": "Back to Age Groups",
      "dashboard": "Back to Dashboard",
      "intro": "Explore these skills and record what you have noticed in everyday moments.",
      "reported": "Parent-reported observations · Read only",
      "question": "Have you observed this skill?",
      "yes": "Yes",
      "notYet": "Not Yet",
      "unsure": "Not Sure",
      "unanswered": "Not Answered Yet",
      "notes": "Notes (optional)",
      "placeholder": "Add any notes about what you have observed…",
      "response": "Mother’s Response",
      "motherNotes": "Mother’s Notes",
      "emptyNote": "No notes recorded.",
      "updated": "Last Updated",
      "saving": "Saving…",
      "saved": "Saved on this browser",
      "failed": "Save failed",
      "retry": "Retry",
      "loadError": "Stored observations could not be read. Editing is disabled to protect existing records. Retry loading.",
      "missing": "Select a child with a valid ID before recording observations.",
      "ageUnknown": "Age unavailable",
      "month": "months old",
      "by": "By",
      "current": "Current checklist stage",
      "younger": "Your child is younger than the first checklist age. You can browse all ages.",
      "older": "Your child is older than these checklist ages. All groups remain available to browse.",
      "tip": "Changes are saved automatically in this browser for this child.",
      "medical": "These checklists are informational, not a diagnostic test. Discuss missed or lost skills or other concerns with your child’s doctor.",
      "source": "CDC checklist",
      "media": "Skill media coming soon",
      "ageMedia": "Growing, one discovery at a time",
      "empty": "No mother observations recorded for this age yet.",
      "progress": "Observations recorded",
      "preview": "Local preview · demo data",
      "mother": "Mother",
      "doctor": "Doctor (read only)",
      "dob": "Demo date of birth",
      "child": "Demo child",
      "loading": "Loading…",
      "categoryNavigation": "Developmental categories",
      "roleLabel": "Role",
      "closePreview": "Close preview",
      "switchLanguage": "العربية",
      "demoChildName": "Demo child",
      "ages": {
        "2": "2 Months",
        "4": "4 Months",
        "6": "6 Months",
        "9": "9 Months",
        "12": "12 Months",
        "15": "15 Months",
        "18": "18 Months",
        "24": "2 Years (24 Months)",
        "30": "30 Months",
        "36": "3 Years (36 Months)"
      },
      "categories": {
        "social": {
          "title": "Social / Emotional",
          "description": "Connecting with people and expressing feelings."
        },
        "language": {
          "title": "Language / Communication",
          "description": "Making sounds, understanding language and communicating."
        },
        "cognitive": {
          "title": "Cognitive",
          "description": "Learning, thinking and solving everyday problems."
        },
        "movement": {
          "title": "Movement / Physical",
          "description": "Moving the body and using hands with growing independence."
        }
      },
      "skills": {
        "2m-social-settle": {
          "motherSentence": "Calms down when you talk to or pick up your baby.",
          "title": "Finding comfort",
          "description": "Settles with your voice or a cuddle"
        },
        "2m-social-face": {
          "motherSentence": "Looks at your face.",
          "title": "Looking at you",
          "description": "Watches your face"
        },
        "2m-social-greet": {
          "motherSentence": "Seems happy to see you when you approach.",
          "title": "A happy greeting",
          "description": "Seems pleased when you approach"
        },
        "2m-social-smile": {
          "motherSentence": "Smiles when you talk to or smile at your baby.",
          "title": "Sharing a smile",
          "description": "Responds to your voice or smile with a smile"
        },
        "2m-language-sounds": {
          "motherSentence": "Makes sounds other than crying.",
          "motherExplanation": "For example, your baby may make soft cooing sounds like “ooo” or “aah.”",
          "title": "Early little sounds",
          "description": "Vocalizes beyond crying"
        },
        "2m-language-loud": {
          "motherSentence": "Reacts to loud sounds.",
          "motherExplanation": "Your baby may blink, startle, or pause when hearing a sudden loud sound.",
          "title": "Hearing a loud sound",
          "description": "Responds to a loud noise"
        },
        "2m-cognitive-watch": {
          "motherSentence": "Watches you as you move.",
          "motherExplanation": "Notice whether your baby's eyes follow you as you move slowly nearby.",
          "title": "Watching you move",
          "description": "Follows your movement with their eyes"
        },
        "2m-cognitive-toy": {
          "motherSentence": "Looks at a toy for several seconds.",
          "title": "Discovering a toy",
          "description": "Studies a toy for a few seconds"
        },
        "2m-movement-head": {
          "motherSentence": "Holds head up when lying on tummy.",
          "motherExplanation": "During tummy time, your baby briefly lifts their head while awake and supervised.",
          "title": "Lifting the head",
          "description": "Lifts their head during tummy time"
        },
        "2m-movement-limbs": {
          "motherSentence": "Moves both arms and both legs.",
          "title": "Moving arms and legs",
          "description": "Moves both arms and both legs"
        },
        "2m-movement-hands": {
          "motherSentence": "Opens hands briefly.",
          "motherExplanation": "Your baby briefly relaxes their fingers and opens their hands instead of keeping them in fists.",
          "title": "Opening little hands",
          "description": "Briefly uncurls their hands"
        },
        "4m-social-smile": {
          "title": "Smiling for attention",
          "description": "Smiles to draw your attention"
        },
        "4m-social-chuckle": {
          "title": "Little chuckles",
          "description": "Gives a little chuckle when entertained"
        },
        "4m-social-attention": {
          "title": "Staying connected",
          "description": "Uses looks, movement or sounds to keep your attention"
        },
        "4m-language-coo": {
          "title": "Cooing sounds",
          "description": "Coos with vowel-like sounds"
        },
        "4m-language-reply": {
          "title": "Answering your voice",
          "description": "Answers your talking with sounds"
        },
        "4m-language-voice": {
          "title": "Turning toward you",
          "description": "Turns toward your voice"
        },
        "4m-cognitive-feed": {
          "title": "Recognizing feeding time",
          "description": "Opens their mouth at the sight of milk when hungry"
        },
        "4m-cognitive-hands": {
          "title": "Discovering hands",
          "description": "Examines their own hands"
        },
        "4m-movement-head": {
          "title": "A steady head",
          "description": "Keeps their head steady while held"
        },
        "4m-movement-grip": {
          "title": "Holding a toy",
          "description": "Keeps hold of a toy placed in their hand"
        },
        "4m-movement-reach": {
          "title": "Reaching toward play",
          "description": "Swings an arm toward toys"
        },
        "4m-movement-mouth": {
          "title": "Hands to mouth",
          "description": "Brings their hands toward their mouth"
        },
        "4m-movement-elbows": {
          "title": "Pushing up on elbows",
          "description": "Props up on forearms during tummy time"
        },
        "6m-social-people": {
          "title": "Familiar people",
          "description": "Recognizes familiar faces"
        },
        "6m-social-mirror": {
          "title": "Mirror discoveries",
          "description": "Enjoys their reflection"
        },
        "6m-social-laugh": {
          "title": "Happy laughter",
          "description": "Laughs aloud"
        },
        "6m-language-turns": {
          "title": "Taking turns with sounds",
          "description": "Takes vocal turns with you"
        },
        "6m-language-raspberry": {
          "title": "Blowing raspberries",
          "description": "Blows air with their tongue out"
        },
        "6m-language-squeal": {
          "title": "Excited squeals",
          "description": "Makes high-pitched happy sounds"
        },
        "6m-cognitive-explore": {
          "title": "Exploring with the mouth",
          "description": "Explores objects with their mouth"
        },
        "6m-cognitive-reach": {
          "title": "Reaching for a toy",
          "description": "Reaches for a wanted toy"
        },
        "6m-cognitive-full": {
          "title": "Showing fullness",
          "description": "Closes their lips to refuse more food"
        },
        "6m-movement-roll": {
          "title": "Rolling over",
          "description": "Rolls from their belly onto their back"
        },
        "6m-movement-push": {
          "title": "Pushing up higher",
          "description": "Pushes up on straight arms on their belly"
        },
        "6m-movement-sit": {
          "title": "Supported sitting",
          "description": "Uses their hands for balance while sitting"
        },
        "9m-social-strangers": {
          "title": "Meeting new people",
          "description": "May cling to you or feel shy with strangers"
        },
        "9m-social-expressions": {
          "title": "Expressing feelings",
          "description": "Shows varied feelings through facial expressions"
        },
        "9m-social-name": {
          "title": "Recognizing their name",
          "description": "Turns attention when their name is called"
        },
        "9m-social-leaving": {
          "title": "Noticing you leave",
          "description": "Responds when you go away"
        },
        "9m-social-peekaboo": {
          "title": "Playing peek-a-boo",
          "description": "Enjoys peek-a-boo with smiles or laughter"
        },
        "9m-language-babble": {
          "title": "Babbling syllables",
          "description": "Repeats varied syllables in babble"
        },
        "9m-language-arms": {
          "title": "Asking to be picked up",
          "description": "Raises their arms to ask to be held"
        },
        "9m-cognitive-search": {
          "title": "Finding a dropped object",
          "description": "Searches for something dropped out of view"
        },
        "9m-cognitive-bang": {
          "title": "Banging toys together",
          "description": "Knocks two objects against each other"
        },
        "9m-movement-situp": {
          "title": "Getting into sitting",
          "description": "Moves into sitting independently"
        },
        "9m-movement-transfer": {
          "title": "Passing between hands",
          "description": "Transfers objects between hands"
        },
        "9m-movement-rake": {
          "title": "Raking food closer",
          "description": "Draws food closer with their fingers"
        },
        "9m-movement-sit": {
          "title": "Sitting independently",
          "description": "Sits without being propped up"
        },
        "12m-social-games": {
          "title": "Playing games together",
          "description": "Joins in familiar hand-clapping games"
        },
        "12m-language-wave": {
          "title": "Waving goodbye",
          "description": "Waves to say goodbye"
        },
        "12m-language-parent": {
          "title": "Calling a parent",
          "description": "Uses a special name for a parent"
        },
        "12m-language-no": {
          "title": "Understanding no",
          "description": "Briefly pauses or stops on hearing no"
        },
        "12m-cognitive-container": {
          "title": "Putting things inside",
          "description": "Drops an object into a container"
        },
        "12m-cognitive-hidden": {
          "title": "Finding hidden toys",
          "description": "Finds an item they watched you hide"
        },
        "12m-movement-stand": {
          "title": "Pulling up to stand",
          "description": "Pulls themself upright to stand"
        },
        "12m-movement-cruise": {
          "title": "Walking along furniture",
          "description": "Steps along while holding furniture"
        },
        "12m-movement-cup": {
          "title": "Drinking with your help",
          "description": "Sips from an open cup you hold"
        },
        "12m-movement-pinch": {
          "title": "A thumb-and-finger grasp",
          "description": "Picks up small items using thumb and index finger"
        },
        "15m-social-copy": {
          "title": "Copying other children",
          "description": "Imitates other children at play"
        },
        "15m-social-show": {
          "title": "Showing something special",
          "description": "Brings your attention to a favorite object"
        },
        "15m-social-clap": {
          "title": "Clapping with excitement",
          "description": "Claps to show excitement"
        },
        "15m-social-hugtoy": {
          "title": "Cuddling a toy",
          "description": "Cuddles a doll or soft toy"
        },
        "15m-social-affection": {
          "title": "Sharing affection",
          "description": "Offers affection with cuddles or kisses"
        },
        "15m-language-words": {
          "title": "Trying new words",
          "description": "Attempts one or two words beyond parent names"
        },
        "15m-language-named": {
          "title": "Recognizing named objects",
          "description": "Looks toward a familiar item you name"
        },
        "15m-language-direction": {
          "title": "Words and gestures",
          "description": "Responds to an instruction paired with a gesture"
        },
        "15m-language-point": {
          "title": "Pointing for help",
          "description": "Points to request something or help"
        },
        "15m-cognitive-use": {
          "title": "Everyday objects",
          "description": "Tries using everyday objects as intended"
        },
        "15m-cognitive-stack": {
          "title": "Stacking objects",
          "description": "Builds a stack of two or more small objects"
        },
        "15m-movement-steps": {
          "title": "First independent steps",
          "description": "Makes a few independent steps"
        },
        "15m-movement-food": {
          "title": "Eating with fingers",
          "description": "Feeds themself some finger foods"
        },
        "18m-social-check": {
          "title": "Checking you are nearby",
          "description": "Explores away from you while checking you are nearby"
        },
        "18m-social-point": {
          "title": "Sharing discoveries",
          "description": "Points out something interesting to share"
        },
        "18m-social-wash": {
          "title": "Ready to wash hands",
          "description": "Offers their hands for washing"
        },
        "18m-social-book": {
          "title": "Sharing a book",
          "description": "Shares a few book pages with you"
        },
        "18m-social-dress": {
          "title": "Helping with clothes",
          "description": "Helps with dressing by offering an arm or foot"
        },
        "18m-language-words": {
          "title": "More new words",
          "description": "Attempts at least three words beyond parent names"
        },
        "18m-language-direction": {
          "title": "Following spoken directions",
          "description": "Follows a single instruction without gestures"
        },
        "18m-cognitive-chores": {
          "title": "Copying your chores",
          "description": "Imitates household tasks you do"
        },
        "18m-cognitive-play": {
          "title": "Simple toy play",
          "description": "Uses toys in a simple purposeful way"
        },
        "18m-movement-walk": {
          "title": "Walking alone",
          "description": "Walks independently"
        },
        "18m-movement-scribble": {
          "title": "Making scribbles",
          "description": "Makes scribbles"
        },
        "18m-movement-cup": {
          "title": "An open cup",
          "description": "Drinks from an open cup, with occasional spills"
        },
        "18m-movement-fingers": {
          "title": "Finger feeding",
          "description": "Uses fingers to feed themself"
        },
        "18m-movement-spoon": {
          "title": "Trying a spoon",
          "description": "Attempts to eat with a spoon"
        },
        "18m-movement-climb": {
          "title": "Climbing on and off",
          "description": "Gets on and off a chair or couch independently"
        },
        "24m-social-feelings": {
          "title": "Noticing others’ feelings",
          "description": "Responds when someone seems hurt or upset"
        },
        "24m-social-reaction": {
          "title": "Looking for reassurance",
          "description": "Checks your expression in an unfamiliar situation"
        },
        "24m-language-book": {
          "title": "Finding book pictures",
          "description": "Points to a book picture you ask about"
        },
        "24m-language-words": {
          "title": "Joining words together",
          "description": "Combines at least two words"
        },
        "24m-language-body": {
          "title": "Knowing body parts",
          "description": "Shows at least two named body parts"
        },
        "24m-language-gestures": {
          "title": "Using more gestures",
          "description": "Uses gestures beyond pointing and waving"
        },
        "24m-cognitive-hands": {
          "title": "Working with both hands",
          "description": "Uses one hand to hold while the other works"
        },
        "24m-cognitive-switch": {
          "title": "Exploring toy controls",
          "description": "Experiments with toy controls"
        },
        "24m-cognitive-toys": {
          "title": "Combining toys",
          "description": "Combines more than one toy in play"
        },
        "24m-movement-kick": {
          "title": "Kicking a ball",
          "description": "Kicks a ball forward"
        },
        "24m-movement-run": {
          "title": "Running along",
          "description": "Moves at a run"
        },
        "24m-movement-stairs": {
          "title": "Walking up stairs",
          "description": "Steps up a few stairs, with or without help"
        },
        "24m-movement-spoon": {
          "title": "Eating with a spoon",
          "description": "Feeds themself with a spoon"
        },
        "30m-social-play": {
          "title": "Playing near and with friends",
          "description": "Plays alongside children and occasionally joins them"
        },
        "30m-social-show": {
          "title": "Look at me",
          "description": "Asks you to watch what they can do"
        },
        "30m-social-routine": {
          "title": "Following routines",
          "description": "Follows a familiar routine when asked"
        },
        "30m-language-words": {
          "title": "A growing vocabulary",
          "description": "Uses around fifty words"
        },
        "30m-language-combine": {
          "title": "Words for actions",
          "description": "Combines words including an action word"
        },
        "30m-language-name": {
          "title": "Naming book pictures",
          "description": "Names a picture when asked what it is"
        },
        "30m-language-pronouns": {
          "title": "Words about self",
          "description": "Uses personal pronouns"
        },
        "30m-cognitive-pretend": {
          "title": "Pretend play",
          "description": "Uses objects symbolically in pretend play"
        },
        "30m-cognitive-solve": {
          "title": "Solving little problems",
          "description": "Finds a simple way to solve a problem"
        },
        "30m-cognitive-steps": {
          "title": "Two-step instructions",
          "description": "Carries out two instructions in sequence"
        },
        "30m-cognitive-color": {
          "title": "Recognizing a color",
          "description": "Identifies at least one color when asked"
        },
        "30m-movement-twist": {
          "title": "Twisting and turning",
          "description": "Turns objects with a twisting hand action"
        },
        "30m-movement-undress": {
          "title": "Taking clothes off",
          "description": "Removes some loose clothing independently"
        },
        "30m-movement-jump": {
          "title": "Jumping with both feet",
          "description": "Jumps clear of the ground on both feet"
        },
        "30m-movement-pages": {
          "title": "Turning book pages",
          "description": "Turns individual book pages"
        },
        "36m-social-settle": {
          "title": "Settling after goodbye",
          "description": "Settles within ten minutes after you leave"
        },
        "36m-social-join": {
          "title": "Joining other children",
          "description": "Notices children and joins their play"
        },
        "36m-language-conversation": {
          "title": "Back-and-forth conversation",
          "description": "Keeps a conversation going for two back-and-forth turns"
        },
        "36m-language-questions": {
          "title": "Asking questions",
          "description": "Asks questions about people, things, places or reasons"
        },
        "36m-language-action": {
          "title": "Describing an action",
          "description": "Describes the action in a picture when asked"
        },
        "36m-language-name": {
          "title": "Saying their name",
          "description": "Gives their first name when asked"
        },
        "36m-language-speech": {
          "title": "Being understood",
          "description": "Is understood by others most of the time"
        },
        "36m-cognitive-circle": {
          "title": "Drawing a circle",
          "description": "Copies a circle after a demonstration"
        },
        "36m-cognitive-hot": {
          "title": "Understanding a safety warning",
          "description": "Heeds a warning about touching something hot"
        },
        "36m-movement-string": {
          "title": "Threading objects",
          "description": "Threads items onto a string"
        },
        "36m-movement-dress": {
          "title": "Getting dressed",
          "description": "Puts on some loose clothing independently"
        },
        "36m-movement-fork": {
          "title": "Using a fork",
          "description": "Eats using a fork"
        }
      },
      "ageMonths": "months",
      "ageSelectorLabel": "Age",
      "storageFailure": "Browser storage could not be read or saved. Check storage permissions and try again; existing data has not been replaced."
    },
    "childProfile": "Child Profile",
    "dateOfBirth": "Date of Birth",
    "weight": "Weight",
    "height": "Height",
    "headCircumference": "Head Circumference"
  },
  "ai": {
    "title": "AI Assistant",
    "askQuestion": "Ask a question",
    "placeholder": "Type your question here",
    "send": "Send",
    "thinking": "Thinking…"
  }
}
