"""
Migration script for new features:
- Auto-reject settings for companies
- Match score and auto-reject for applications
- Notifications table
"""
from sqlalchemy import text
from app.core.database import SessionLocal

def run_migration():
    db = SessionLocal()
    
    # 1. Add auto_reject columns to companies
    try:
        db.execute(text('ALTER TABLE companies ADD COLUMN auto_reject_enabled BOOLEAN DEFAULT 0'))
        print('✓ Added auto_reject_enabled to companies')
    except Exception as e:
        if 'duplicate column' in str(e).lower():
            print('- auto_reject_enabled already exists')
        else:
            print(f'! Error: {e}')
    
    try:
        db.execute(text('ALTER TABLE companies ADD COLUMN auto_reject_threshold INTEGER DEFAULT 50'))
        print('✓ Added auto_reject_threshold to companies')
    except Exception as e:
        if 'duplicate column' in str(e).lower():
            print('- auto_reject_threshold already exists')
        else:
            print(f'! Error: {e}')
    
    try:
        db.execute(text('ALTER TABLE companies ADD COLUMN auto_reject_delay_days INTEGER DEFAULT 7'))
        print('✓ Added auto_reject_delay_days to companies')
    except Exception as e:
        if 'duplicate column' in str(e).lower():
            print('- auto_reject_delay_days already exists')
        else:
            print(f'! Error: {e}')
    
    db.commit()
    
    # 2. Add match_score and auto_reject columns to applications
    try:
        db.execute(text('ALTER TABLE applications ADD COLUMN match_score INTEGER'))
        print('✓ Added match_score to applications')
    except Exception as e:
        if 'duplicate column' in str(e).lower():
            print('- match_score already exists')
        else:
            print(f'! Error: {e}')
    
    try:
        db.execute(text('ALTER TABLE applications ADD COLUMN auto_reject_scheduled BOOLEAN DEFAULT 0'))
        print('✓ Added auto_reject_scheduled to applications')
    except Exception as e:
        if 'duplicate column' in str(e).lower():
            print('- auto_reject_scheduled already exists')
        else:
            print(f'! Error: {e}')
    
    try:
        db.execute(text('ALTER TABLE applications ADD COLUMN auto_reject_at DATETIME'))
        print('✓ Added auto_reject_at to applications')
    except Exception as e:
        if 'duplicate column' in str(e).lower():
            print('- auto_reject_at already exists')
        else:
            print(f'! Error: {e}')
    
    try:
        db.execute(text('ALTER TABLE applications ADD COLUMN auto_reject_reason VARCHAR(255)'))
        print('✓ Added auto_reject_reason to applications')
    except Exception as e:
        if 'duplicate column' in str(e).lower():
            print('- auto_reject_reason already exists')
        else:
            print(f'! Error: {e}')
    
    db.commit()
    
    # 3. Create notifications table
    try:
        db.execute(text('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type VARCHAR(50) NOT NULL,
                reference_id INTEGER,
                reference_type VARCHAR(50),
                title VARCHAR(255) NOT NULL,
                message TEXT,
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                read_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        '''))
        db.execute(text('CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)'))
        db.execute(text('CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read)'))
        db.commit()
        print('✓ Created notifications table')
    except Exception as e:
        print(f'! Notifications table error: {e}')
        db.rollback()
    
    db.close()
    print('\n✅ Migration complete!')

if __name__ == '__main__':
    run_migration()
