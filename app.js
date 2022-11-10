import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import { MongoClient } from "mongodb";

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

app.listen(process.env.PORT, () => console.log(`Server running in port: ${process.env.PORT}`))