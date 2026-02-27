import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config: sql.config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '123',
    database: process.env.DB_NAME || 'PortfolioDB',
    server: process.env.DB_SERVER || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '1433'),
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
    }
};

const poolPromise: Promise<sql.ConnectionPool> = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('✅ Connected to MS SQL Server (port ' + config.port + ')');
        return pool;
    })
    .catch((err: Error) => {
        console.error('❌ Database Connection Failed:', err.message);
        console.error('\n   ⚠️  ACTION REQUIRED:');
        console.error('   1. Open SQL Server Management Studio (SSMS)');
        console.error('   2. Connect to your SQLEXPRESS2025 instance');
        console.error('   3. Run: ALTER LOGIN sa ENABLE; ALTER LOGIN sa WITH PASSWORD = \'123\';');
        console.error('   4. Ensure TCP/IP is enabled in SQL Server Configuration Manager');
        console.error('   5. Update .env file: DB_SERVER and DB_PORT if needed');
        process.exit(1);
    });

export { sql, poolPromise };
