import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import { MongoClient } from "mongodb";
import daysjs from "dayjs"

//CONFIGURAÇÕES
dotenv.config();
const app = express()
app.use(express.json())
app.use(cors())

//BANCO DE DADOS
const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
    await mongoClient.connect()
    console.log("MongoDB Conectado!")
} catch (err) {console.log(err)}

const collectionUsers = mongoClient.db("uol").collection("users")
const collectionMessages = mongoClient.db("uol").collection("messages")


//post participants
app.post("/participants", async (req,res) => {
    const {name} = req.body

    if (!name) {res.status(422).send("'Name' deve ser strings, não vazio!")}

    const user = {name,lastStatus: Date.now()}
    try {
        await collectionUsers.insertOne(user)
    } catch (erro) {console.log(erro)} 


    const message = {from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: 'HH:MM:SS'}
    try {
        await collectionMessages.insertOne(message)
        res.sendStatus(201)
    } catch (erro) {console.log(erro)}
})




app.listen(process.env.PORT, () => console.log(`Server running in port: ${process.env.PORT}`))