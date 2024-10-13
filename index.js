import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import pkg from 'pg';
import connectPgSimple from "connect-pg-simple";
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';



const { Pool } = pkg; 
import path from 'path';
dotenv.config();
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));


const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://your-connection-string-here',
});

app.use(bodyParser.urlencoded({ extended: true }));


const pgStore = connectPgSimple(session)
app.use(session({
    secret: process.env.SECRET || "abcd",
    resave: false,
    saveUninitialized: false,
    store: new pgStore({
        pool,
        tableName: "sessions"
    }),
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}))
  
//Auth middleware
const isAuthenticated = (req, res, next) => {
    if(req.session.user) {
        next()
    }
    else{
        res.redirect("/login");
    }
}

//Routes


app.get("/", (req,res) => {
    res.redirect("/login");
    
})

app.get("/login", (req,res) => {
    res.render("login.ejs", {error: "error in login"});
    
})

app.post("/login", async(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
try{
    const result = await pool.query("SELECT  * FROM users WHERE email = $1", [username]);
    const user = result.rows[0];

    if (!user) {
        res.send("User not found");
    }
    else {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = {user: username};
            res.redirect("/transactions");

        }
        else{
            res.send("wrong pass");
        }
    }
}

    catch (error){
        console.error("error during login", error);
    }

})




app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.post('/register', async(req, res) => {
    const Ruser = req.body.username;
    const Rpass = req.body.password;
    try{
        const hashedPassword = await bcrypt.hash(Rpass, 10);

      await  pool.query("INSERT INTO users (email, password) VALUES ($1, $2)", [Ruser , hashedPassword]);
        res.send("Registerd success, login again");
    }

    catch(error){
        console.error(error);

    }

})

app.get('/register', (req, res) => {
    res.render("register.ejs");
})

app.get("/transactions", async (req , res) => {
    try{
        const result = await pool.query("SELECT * FROM expense ORDER BY date DESC");
        console.log(result.rows);
        res.render("transaction.ejs" , { transactions : result.rows});
    }
    catch(error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Error fetching transactions');
    }

})

app.post('/transactions/add', async (req, res) => {
    const { description, amount } = req.body;
    try {
        await pool.query('INSERT INTO expense (type, amount) VALUES ($1, $2)', [description, amount]);
        res.redirect('/transactions');
    } catch (error) {
        console.error('Error adding transaction:', error);
        res.status(500).send('Error adding transaction');
    }
});

app.post('/transactions/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM expense WHERE id = $1', [id]);
        res.redirect('/transactions');
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).send('Error deleting transaction');
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Expense Tracker running at http://localhost:${port}`);
});