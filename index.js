const mysql2 = require('mysql2');
const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const path = require('path');
const cors = require('cors');

const publicPath = path.join(__dirname, 'www');

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
};
app.use(cors(corsOptions));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

const pool = mysql2.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

io.on('connection', (socket) => {
    console.log("Um usuário está conectado");

    pool.query("SELECT * FROM mensagens ORDER BY criado_em ASC", (err, results) => {
        if (err) {
            console.error("Erro ao buscar mensagens:", err);
            return;
        }
        socket.emit('mensagens', results);
    });

    // Login do usuário
    socket.on('login', (nome) => {
        console.log(`Login tentativa: ${nome}`); 
        pool.query("SELECT * FROM usuarios WHERE nome = ?", [nome], (err, results) => {
            if (err) {
                console.error("Erro ao verificar usuário:", err);
                socket.emit('loginResposta', { sucesso: false, mensagem: "Erro no servidor" });
                return;
            }
            if (results.length > 0) {
                socket.emit('loginResposta', { sucesso: true, nome });
            } else {
                socket.emit('loginResposta', { sucesso: false, mensagem: "Usuário não encontrado" });
            }
        });
    });

    socket.on('mensagem', (data) => {
        const { mensagem, nome } = data;
        pool.query("INSERT INTO mensagens (mensagem, nome) VALUES (?, ?)", [mensagem, nome], (err) => {
            if (err) {
                console.error("Erro ao inserir mensagem:", err);
                return;
            }
            io.emit('mensagem', { mensagem, nome });
        });
    });

    socket.on('disconnect', () => {
        console.log("Usuário desconectado");
    });
});

server.listen(3000, () => {
    console.log("Servidor está rodando na porta 3000");
});
