export type Lang = 'hu' | 'en';

export interface Dictionary {
  // Global
  brand: string;
  getStarted: string;
  dashboard: string;
  signOut: string;
  loading: string;
  cancel: string;
  save: string;
  delete: string;
  saving: string;
  or: string;
  yes: string;
  no: string;
  submit: string;
  create: string;
  update: string;
  search: string;
  draft: string;
  published: string;

  // Nav
  nav: {
    home: string;
    library: string;
    researchSummaries: string;
    selfChecks: string;
    about: string;
    journal: string;
    history: string;
    dataExport: string;
    account: string;
    navigate: string;
    explore: string;
    management: string;
    manageLibrary: string;
    manageUsers: string;
    analystExport: string;
  };

  // Index / Landing
  landing: {
    heroTitle: string;
    heroSubtitle: string;
    browseLibrary: string;
    startSelfCheck: string;
    libraryTitle: string;
    librarySubtitle: string;
    noArticles: string;
    researchTitle: string;
    researchSubtitle: string;
    noResearch: string;
    selfCheckPreviewTitle: string;
    selfCheckPreviewSubtitle: string;
    sampleQuestions: string;
    goToSelfChecks: string;
    createYourSpace: string;
    createFreeAccount: string;
    aboutTitle: string;
    aboutP1: string;
    aboutP2: string;
    footerRights: string;
    terms: string;
    cookies: string;
    gdpr: string;
  };

  // Sample preview questions
  sampleQuestions: {
    q1: string;
    q1Type: string;
    q2: string;
    q2Type: string;
    q3: string;
    q3Type: string;
  };

  // Auth
  auth: {
    createYourSpace: string;
    welcomeBack: string;
    beginJourney: string;
    returnSanctuary: string;
    displayName: string;
    yourName: string;
    email: string;
    password: string;
    howUse: string;
    affectedPerson: string;
    affectedPersonDesc: string;
    observer: string;
    observerDesc: string;
    pleaseWait: string;
    createAccount: string;
    signIn: string;
    continueGoogle: string;
    continueApple: string;
    connecting: string;
    alreadyHaveAccount: string;
    noAccount: string;
    welcomeToast: string;
  };

  // Dashboard
  dash: {
    welcomeBack: string;
    yourSpace: string;
    recentActivity: string;
    noActivity: string;
    logObservation: string;
    logObservationDesc: string;
    completeSelfCheck: string;
    completeSelfCheckDesc: string;
    viewHistory: string;
    viewHistoryDesc: string;
  };

  // Journal
  journal: {
    title: string;
    subtitle: string;
    newEntry: string;
    patterns: string;
    searchEntries: string;
    noEntries: string;
    noMatch: string;
    entryUpdated: string;
    entryLogged: string;
    entryDeleted: string;
    reflectionSaved: string;
    reflectionRemoved: string;
  };

  // Self-Checks
  selfChecks: {
    title: string;
    subtitle: string;
    noAvailable: string;
    completed: string;
    deleteConfirmTitle: string;
    deleteConfirmDesc: string;
    editSelfCheck: string;
    newSelfCheck: string;
    selfCheckTitle: string;
    description: string;
    questions: string;
    addQuestion: string;
    selfCheckUpdated: string;
    selfCheckCreated: string;
    selfCheckDeleted: string;
    submitting: string;
  };

  // Timeline
  timeline: {
    title: string;
    subtitle: string;
    allActivity: string;
    noActivity: string;
    noEntriesOnDay: string;
    dayNames: string[];
    journalLabel: string;
    selfCheckLabel: string;
  };

  // Profile
  profile: {
    title: string;
    subtitle: string;
    profileSection: string;
    emailLabel: string;
    displayNameLabel: string;
    saveChanges: string;
    profileUpdated: string;
    roleFraming: string;
    adminAssigned: string;
    yourData: string;
    yourDataDesc: string;
    exportAllData: string;
    dataExported: string;
  };

  // Export
  export: {
    title: string;
    subtitle: string;
    desc: string;
    exportAll: string;
  };

  // Manage Library
  manageLibrary: {
    title: string;
    subtitle: string;
    newArticle: string;
    searchArticles: string;
    allCategories: string;
    editArticle: string;
    articleTitle: string;
    excerpt: string;
    url: string;
    source: string;
    category: string;
    articleUpdated: string;
    articleCreated: string;
    articleDeleted: string;
    deleteConfirmTitle: string;
    deleteConfirmDesc: string;
    noArticles: string;
    noMatch: string;
    loadingArticles: string;
  };

  // Manage Users
  manageUsers: {
    title: string;
    subtitle: string;
    noUsers: string;
    loadingUsers: string;
    removeRole: string;
    removeRoleDesc: string;
    addedRole: string;
    removedRole: string;
    you: string;
    noRoles: string;
  };

  // Analyst Export
  analystExport: {
    title: string;
    subtitle: string;
    accessDenied: string;
    accessDeniedDesc: string;
    depersonalised: string;
    journalCounts: string;
    questionnaireDist: string;
    roleDist: string;
    privacyNote: string;
    downloadData: string;
    exporting: string;
    exported: string;
  };

  // Not found
  notFound: {
    title: string;
    subtitle: string;
    returnHome: string;
  };

  // Observations
  observations: {
    tabQuestionnaires: string;
    tabObservations: string;
    chooseDomain: string;
    pickObservation: string;
    qualifiers: string;
    intensity: string;
    frequency: string;
    context: string;
    notes: string;
    freqOnce: string;
    freqSometimes: string;
    freqOften: string;
    freqConstant: string;
    logged: string;
    noCategories: string;
    noConcepts: string;
    noLogs: string;
    recentObservations: string;
    back: string;
    logObservation: string;
    manage: string;
    addCategory: string;
    addConcept: string;
    editCategory: string;
    editConcept: string;
    categoryName: string;
    conceptName: string;
    conceptCode: string;
    conceptDescription: string;
    iconName: string;
    deleteCategoryConfirm: string;
    deleteConceptConfirm: string;
    categorySaved: string;
    categoryDeleted: string;
    conceptSaved: string;
    conceptDeleted: string;
  };

  // Emergency exit
  emergencyExit: string;

  // Language
  langToggle: {
    hu: string;
    en: string;
  };
}
