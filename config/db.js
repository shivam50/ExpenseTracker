

import pg from "pg";


const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "expenseTracker"
    port: 5432
})