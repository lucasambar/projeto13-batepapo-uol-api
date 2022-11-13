import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import joi from 'joi';


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

//joi schema
const userSchema = joi.object({
    name: joi.string().required(),
})
const messageSchema = joi.object({
    to: joi.string()
})

//post participants
app.post("/participants", async (req,res) => {
    const {name} = req.body

    // const validation = await userSchema.validate(req.body, {abortEarly: false})
    // if (validation.err) {
    //     const err = details.map((detail) => detail.message);
    //     res.status(422).send(err);
    //     return
    // }
    
    const exist = await collectionUsers.findOne({name: name})
    if (exist) {res.sendStatus(409);return}

    const user = {name,lastStatus: Date.now()}
    try {
        await collectionUsers.insertOne(user)
    } catch (erro) {console.log(erro)} 

    let time = (dayjs().format('HH:mm:ss', 'es'))

    const message = {from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time}
    console.log(message)
    try {
        await collectionMessages.insertOne(message)
        res.sendStatus(201)
    } catch (erro) {console.log(erro)}
})

app.get("/participants", async (req,res) => {
    let users;
    
    try {
         users = await collectionUsers.find().toArray()
    } catch (erro) {console.log(erro)} 

    res.send(users)
})

app.post("/messages", async (req,res) => {
    const {user} = req.headers //from

    const exist = await collectionUsers.findOne({name: user})
    if (!exist) {res.status(422).send("Usuário não cadastrado");return}

    const {to, text, type} = req.body

    //verificar req.body

    const time = (dayjs().format('HH:mm:ss', 'es'))

    const message = {from: user, to: to, text: text, type: type, time: time}

    try {
        await collectionMessages.insertOne(message)
        res.status(201).send(message)
    } catch (erro) {console.log(erro)}
})

app.listen(process.env.PORT, () => console.log(`Server running in port: ${process.env.PORT}`))