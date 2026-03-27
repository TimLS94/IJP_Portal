// Test-Daten für E2E Tests
export const testUsers = {
  applicant: {
    email: 'test.applicant@example.com',
    password: 'Test123!',
    firstName: 'Test',
    lastName: 'Bewerber'
  },
  company: {
    email: 'test.company@example.com',
    password: 'Test123!',
    companyName: 'Test GmbH'
  },
  admin: {
    email: 'admin@jobon.work',
    password: 'AdminTest123!'
  }
};

export const testJob = {
  title: 'E2E Test Stelle - Saisonarbeiter',
  description: 'Dies ist eine automatisch erstellte Teststelle für E2E Tests.',
  location: 'Berlin',
  salaryMin: 12,
  salaryMax: 15,
  positionType: 'saisonjob'
};
