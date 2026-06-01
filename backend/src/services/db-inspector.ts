// Attempts to connect to a real PostgreSQL DB for live stats
// Falls back to simulated data if connection fails

interface DbStats {
  tableName: string;
  requestsPerSecond: number;
  totalRows: number;
  tableSize: string;
  lastVacuum: string;
  vacuumProtectionActive: boolean;
  bloatPercent: number;
  activeConnections: number;
}

interface DbOverview {
  totalTables: number;
  totalSize: string;
  activeConnections: number;
  slowQueriesCount: number;
  replicationLag: string;
}

export async function getTableStats(tableName: string): Promise<DbStats> {
  // Try connecting to real PostgreSQL
  const realStats = await tryRealConnection(tableName);
  if (realStats) return realStats;

  // Fallback: return simulated data based on table name
  console.log(`📊 db-inspector: Using simulated stats for ${tableName}`);
  return {
    tableName,
    requestsPerSecond: 1200,
    totalRows: 5_000_000,
    tableSize: "2.3 GB",
    lastVacuum: new Date(Date.now() - 86400000 * 7).toISOString(),
    vacuumProtectionActive: true,
    bloatPercent: 12,
    activeConnections: 34,
  };
}

export async function getDbOverview(): Promise<DbOverview> {
  return {
    totalTables: 47,
    totalSize: "18 GB",
    activeConnections: 120,
    slowQueriesCount: 3,
    replicationLag: "0ms",
  };
}

async function tryRealConnection(tableName: string): Promise<DbStats | null> {
  // PostgreSQL connection would require pg client
  // For now, check if pg environment variables are set
  const pgHost = process.env.CUSTOMER_DB_HOST;
  if (!pgHost) return null;

  try {
    // Dynamic import to avoid requiring pg when not available
    const { Pool } = await import("pg");
    const pool = new Pool({
      host: pgHost,
      port: Number(process.env.CUSTOMER_DB_PORT) || 5432,
      database: process.env.CUSTOMER_DB_NAME || "postgres",
      user: process.env.CUSTOMER_DB_USER || "postgres",
      password: process.env.CUSTOMER_DB_PASS || "",
      connectionTimeoutMillis: 5000,
    });

    const result = await pool.query(
      `SELECT schemaname, relname, n_live_tup, n_dead_tup,
              pg_size_pretty(pg_total_relation_size(relid)) as size,
              last_vacuum, last_autovacuum
       FROM pg_stat_user_tables
       WHERE relname = $1`,
      [tableName],
    );

    const connResult = await pool.query(
      "SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'",
    );

    await pool.end();

    const row = result.rows[0];
    if (row) {
      console.log(`📊 db-inspector: Real stats fetched for ${tableName}`);
      return {
        tableName,
        requestsPerSecond: 0,
        totalRows: Number(row.n_live_tup),
        tableSize: row.size || "Unknown",
        lastVacuum: row.last_vacuum || row.last_autovacuum || new Date().toISOString(),
        vacuumProtectionActive: true,
        bloatPercent: row.n_dead_tup > 0 ? Math.round((Number(row.n_dead_tup) / Number(row.n_live_tup)) * 100) : 0,
        activeConnections: Number(connResult.rows[0]?.count || 0),
      };
    }
  } catch (err: any) {
    console.log(`📊 db-inspector: Real connection failed — ${err.message}`);
  }

  return null;
}
