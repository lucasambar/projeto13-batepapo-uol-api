import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import { MongoClient, ObjectId } from "mongodb";
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
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.any().allow( 'message','private_message')
})

//post participants
app.post("/participants", async (req,res) => {
    const {name} = req.body

    const validation = await userSchema.validate(req.body, {abortEarly: false})

    if (validation.error) {
        const error = validation.error.details.map((detail) => detail.message);
        res.status(422).send(error);
        return
    }
    
    const exist = await collectionUsers.findOne({name: name})
    if (exist) {res.sendStatus(409);return}

    const user = {name,lastStatus: Date.now()}
    try {
        await collectionUsers.insertOne(user)
    } catch (erro) {console.log(erro)} 

    let time = (dayjs().format('HH:mm:ss', 'es'))

    const message = {from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time}

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

    const validation = await messageSchema.validate(req.body, {abortEarly: false})

    if (validation.error) {
        const error = validation.error.details.map((detail) => detail.message);
        res.status(422).send(error);
        return
    }
    
    const time = (dayjs().format('HH:mm:ss', 'es'))

    const message = {from: user, to: to, text: text, type: type, time: time}

    try {
        await collectionMessages.insertOne(message)
        res.status(201).send(message)
    } catch (erro) {console.log(erro)}
})

app.get("/messages", async (req,res) => {
    let limit;
    if (parseInt(req.query.limit)) {
        limit = parseInt(req.query.limit)
    }

    let messagesDB;
    try {
        messagesDB = await collectionMessages.find().toArray()
    } catch (erro) {console.log(erro)}     

    let {user} = req.headers
    const messagesFilter = messagesDB.filter((message) => {
        if (message.to === user || message.to === "Todos"){
            return message
        }})
    
    const messagesReverse = messagesFilter.reverse()

    if (limit) {
        const messages = messagesReverse.slice(0, limit)
        res.send(messages)
    } else {
        res.send(messagesReverse)
    }
    
})

app.post("/status", async(req,res) => {
    const {user} = req.headers

    let userFind;
    try {
        userFind = await collectionUsers.findOne({name: user})
    } catch (err) {res.sendStatus(500); console.log(err)}

    if (!userFind) {res.sendStatus(404); return}

    try {
        await collectionUsers.updateOne({_id: userFind._id},{$set: {lastStatus: Date.now()}})
    } catch (err) {res.sendStatus(500); console.log(err)}

    res.sendStatus(200)
})

//remoção de usuarios inativos
setInterval(async () => {
    try {
        const users = await collectionUsers.find().toArray()
        if (users) {
            users.forEach(async (user) => {
                if (Date.now() - 10000 > user.lastStatus) {
                    await collectionUsers.deleteOne({ _id: user._id});

                    const time = (dayjs().format('HH:mm:ss', 'es'))
                    const message = {from: user.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: time}
                    await collectionMessages.insertOne(message)
                }
            })
        }
    } catch (err) {console.log(err)}
}, 15000)

app.delete("/messages/:idMsg", async (req,res) => {
    const {user} = req.headers
    const id = req.params.idMsg

    try {
        const msgFind = await collectionMessages.findOne({_id: ObjectId(id)})
        if (!msgFind) {
            res.sendStatus(404)
            return 
        } 
        if (msgFind.from !== user) {
            res.sendStatus(402)
            return
        }  
    } catch (err) {res.sendStatus(500); console.log(err)} 
    
    await collectionMessages.deleteOne({ _id: ObjectId(id)});

    res.sendStatus(200)
})

app.put("/messages/:idMsg", async (req, res) => {
    const id = req.params.idMsg
    const {user} = req.headers //from

    try {
        const msgFind = await collectionMessages.findOne({_id: ObjectId(id)})
        if (!msgFind) {
            res.sendStatus(404)
            return 
        } 
        if (msgFind.from !== user) {
            res.sendStatus(402)
            return
        }
    } catch (err) {res.sendStatus(500); console.log(err)}

    const {to, text, type} = req.body

    const validation = await messageSchema.validate(req.body, {abortEarly: false})
    console.log(validation)
    if (validation.error) {
        const error = validation.error.details.map((detail) => detail.message);
        res.status(422).send(error);
        return
    }
    try {
        await collectionMessages.updateOne(
            { _id: ObjectId(id) },
            { $set:
               {
                to,
                text,
                type
               }
            }
         )
    } catch (erro) {res.sendStatus(500); console.log(erro);return}

    res.sendStatus(200)
})

app.listen(process.env.PORT, () => console.log(`Server running in port: ${process.env.PORT}`))