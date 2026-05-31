-- CRM: Extend ijp_betriebe with new fields and add crm_contacts table
ALTER TABLE ijp_betriebe ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE ijp_betriebe ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE ijp_betriebe ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE ijp_betriebe ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE ijp_betriebe ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE ijp_betriebe ALTER COLUMN contact_person DROP NOT NULL;
ALTER TABLE ijp_betriebe ALTER COLUMN street DROP NOT NULL;
ALTER TABLE ijp_betriebe ALTER COLUMN postal_code DROP NOT NULL;
ALTER TABLE ijp_betriebe ALTER COLUMN city DROP NOT NULL;

CREATE TABLE IF NOT EXISTS crm_contacts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES ijp_betriebe(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    salutation VARCHAR(20),
    title VARCHAR(100),
    department VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_crm_contacts_company_id ON crm_contacts (company_id);
