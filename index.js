const mysql2 = require('mysql2');
const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const path = require('path');
const cors = require('cors');

// Caminho absoluto para a pasta 'www'
const publicPath = path.join(__dirname, 'www');

// Cria o aplicativo Express e o servidor HTTP
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Configuração do CORS
const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
};
app.use(cors(corsOptions));

// Serve o arquivo index.html diretamente
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Configuração do banco de dados
const mysqli = mysql2.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

mysqli.connect((err) => {
    if (err) {
        console.error("Erro ao conectar ao banco de dados:", err);
        return;
    }
    console.log("Conectado ao banco com sucesso");
});

io.on('connection', (socket) => {
    console.log("Um usuário está conectado");

    // Enviar mensagens antigas ao novo cliente
    mysqli.query("SELECT * FROM mensagens ORDER BY criado_em ASC", (err, results) => {
        if (err) {
            console.error("Erro ao buscar mensagens:", err);
            return;
        }
        socket.emit('mensagens', results);
    });

    // Login do usuário
    socket.on('login', (nome) => {
        console.log(`Login tentativa: ${nome}`); // Log de tentativa de login
        mysqli.query("SELECT * FROM usuarios WHERE nome = ?", [nome], (err, results) => {
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

    // Recebendo e salvando novas mensagens
    socket.on('mensagem', (data) => {
        const { mensagem, nome } = data;
        mysqli.query("INSERT INTO mensagens (mensagem, nome) VALUES (?, ?)", [mensagem, nome], (err) => {
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
