import express from 'express';
import fs from 'fs'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import axios from 'axios'

const app = express();
const prisma = new PrismaClient();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Remplacez par l'URL de votre frontend
    methods: ["GET", "POST"]
  }
});
const Port = 5050;

app.use(express.json());
app.use(cors());

const SECRET_KEY = 'mickaelrkt20@gmail.com'; // Remplacez par une clé secrète sécurisée

// Création de compte
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'User already exists' });
  }
});

// Authentification
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});


// // decode user by token
// app.get('/users', async (req, res) => {
//   const users = await prisma.user.findMany({
//     select: { id: true, email: true },
//   });
//   res.json(users);
// });


// Récupérer les utilisateurs
app.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  res.json(users);
});


// Obtenir l'ID de l'utilisateur à partir du token
app.post('/userId', async (req, res) => {
    const token = req.body.token;
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      res.json({ userId: decoded.userId });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
});


// GET INFO USER BY TOKEN
app.post('/getuserinfo', async (req, res) => {
  const token = req.body.token;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);

    const user = await prisma.user.findUnique({
      where:{id : decoded.userId}
    });

    res.json({ user: user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// update message
app.put('/updatemessage', async (req, res) => {
  const messageId = req.body.messageId;
  const isSpam  = req.body.isSpam;

  try {
    const message = await prisma.message.findUnique({
      where: { id: parseInt(messageId) }
    });

    const updatedMessage = await prisma.message.update({
      where: { id: parseInt(messageId) },
      data: { isSpam },
    });

    const messageClass = isSpam ? 0 : 1;

    const newLine = `${messageClass},${message.content}\n`;

    fs.appendFileSync('data.csv', newLine, 'utf8');

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(400).json({ error: 'Message not found or invalid data' });
  }
});


// Obtenir l'ID de l'utilisateur à partir du token
app.post('/getmessageuser', async (req, res) => {
    const token = req.body.token;
    const type = req.body.type

    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      const receiverId = decoded.userId
      const messageUser = await prisma.message.findMany({
        where: {
            isSpam : type,
            receiverId : parseInt(receiverId)
        }, orderBy: {
            id:'desc',
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      res.json({ message: messageUser });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
});


// Obtenir l'ID de l'utilisateur à partir du token
app.post('/getmessageenvoieuser', async (req, res) => {
  const token = req.body.token;

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const senderId = decoded.userId
    const messageUser = await prisma.message.findMany({
      where: {
          senderId : parseInt(senderId)
      }, orderBy: {
          id:'desc',
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    res.json({ message: messageUser });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

  

// Récupérer les messages entre deux utilisateurs
app.get('/mymessage', async (req, res) => {
    const { userId } = req.params;
    const token = req.body.token; // Extraire le token des en-têtes
  
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      const currentUserId = decoded.userId;
  
      // Récupérer les messages envoyés et reçus entre les deux utilisateurs
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId },
          ],
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
  
      res.json(messages);
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
});

  

// Envoyer un message (email)
app.post('/messages', async (req, res) => {
  const { token, content, receiverId } = req.body;

  try {
    const repDjango = await axios.post('http://localhost:8000/api/classify_message/', { content: content });
    const isSpam = repDjango.data.is_spam;

    const decoded = jwt.verify(token, SECRET_KEY);
    const senderId = decoded.userId;

    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId,
        isSpam: isSpam, // Use the classification result from Django
      },
    });

    const messageSender = await prisma.message.findUnique({
      where: {
          id : parseInt(message.id)
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Send the message to the sender and the receiver using Socket.IO
    io.to(senderId).emit('new_message', messageSender);
    io.to(receiverId).emit('new_message', messageSender);

    res.status(201).json(message);
  } catch (error) {
    console.error('Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});


// reentrainer model
app.get('/retrain', async (req, res) => {
  try {
    const repDjango = await axios.post('http://localhost:8000/api/retrain_model/');

    const responseMessage = repDjango.data.message;

    // Send the success response back to the client
    res.status(200).json({ message: responseMessage });
  } catch (error) {
    console.error('Error while reloading model:', error);

    // Send the error response back to the client
    res.status(500).json({ error: 'Server error while reloading model' });
  }
});


// Reload server
app.get('/reload', async (req, res) => {
  try {
    // Tentative de redémarrage du serveur Django
    await axios.post('http://localhost:8000/api/reload_model/', null, {
      timeout: 10000 // 10 secondes
    });

    // Réponse de succès
    res.status(200).json({ message: "ao zay !" });
  } catch (error) {
    if (error.code === 'ECONNRESET') {
      console.error('Connection was reset while trying to reload the model.');
      res.status(503).json({ error: 'Server is temporarily unavailable. Please try again later.' });
    } else {
      console.error('Error while reloading model:', error);
      res.status(500).json({ error: 'Server error while reloading model' });
    }
  }
});
  
  io.on('connection', (socket) => {
    console.log('A user connected');
  
    // Recevoir l'ID utilisateur de la session actuelle
    socket.on('join', (userId) => {
      socket.join(userId); // Joindre la salle correspondant à l'ID utilisateur
    });
  
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
});


server.listen(Port, () => {
  console.log(`Server running on http://localhost:${Port}`);
});
