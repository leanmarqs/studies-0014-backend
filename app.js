import express from 'express'
import { PrismaClient } from '@prisma/client'
import cors from 'cors'
import { check, z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const app = express()
const prisma = new PrismaClient()

const PORT = process.env.PORT
const LOCAL_HOST = process.env.LOCAL_HOST
const GLOBAL_HOST = process.env.GLOBAL_HOST

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Main Page')

})

function checkToken(req, res, next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if(!token){
        return res.status(401).json({
            msg: 'Acesso negado!'
        })
    }
    try{
        const secret = process.env.SECRET

        jwt.verify(token, secret)

        next()
    }catch(error){
        res.status(400).json({
            msg: 'Token Invalido!'
        })
    }
}

// login
app.post('/auth/login', async (req, res) => {
const userSchema = z
  .object({
    email: z
      .email({ message: "E-mail inválido" }),
    password: z
      .string({ required_error: "A senha é obrigatória" })
      .min(6, { message: "A senha deve ter no mínimo 6 caracteres" })
      .max(16, { message: "A senha deve ter no máximo 16 caracteres" }),
  });

  try {
    const { email, password } = userSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user)
      return res.status(404).json({ message: "Usuário não cadastrado." });

    const checkPassword = await bcrypt.compare(password, user.password)

    if(!checkPassword)
        return res.status(422).json({ message: "Senha Inválida." });


    try{

        const secret = process.env.SECRET

        const token = jwt.sign(
            {
                id: user.id,
            },
            secret,
        )

        res.status(200).json({ message: "Login realizado com sucesso!", token });

    }catch(error){
        res.status(500).json({
        message: "Falha ao Logar!",
        error: error.message,
    });
    }

  } catch (error) {
    if (error?.issues) {
      return res.status(400).json({
        message: "Erro de validação",
        errors: error.issues.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
    res.status(500).json({
      message: "Falha ao Logar!",
      error: error.message,
    });
  }
});



// CREATE,2,
app.post("/register", async (req, res) => {
  const userSchema = z
  .object({
    name: z
      .string({ required_error: "O nome é obrigatório" })
      .min(2, { message: "O nome deve ter no mínimo 2 caracteres" })
      .max(100, { message: "O nome deve ter no máximo 100 caracteres" }),
    email: z
      .email({ message: "E-mail inválido" }),
    password: z
      .string({ required_error: "A senha é obrigatória" })
      .min(6, { message: "A senha deve ter no mínimo 6 caracteres" })
      .max(16, { message: "A senha deve ter no máximo 16 caracteres" }),
    confirmPassword: z
      .string({ required_error: "A confirmação da senha é obrigatória" })
      .max(16, { message: "A senha deve ter no máximo 16 caracteres" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
  try {
    const { name, email, password } = userSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(400).json({ message: "E-mail já cadastrado." });

    const salt = await bcrypt.genSalt(12)
    const hashed = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true },
    });

    res.status(201).json({ message: "Usuário criado com sucesso!", user });

  } catch (error) {
    if (error?.issues) {
      return res.status(400).json({
        message: "Erro de validação",
        errors: error.issues.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
    res.status(500).json({
      message: "Falha ao criar usuário!",
      error: error.message,
    });
  }
});


// READ BY ID
app.get('/user/:id', checkToken, async (req, res) => {
    const userID = Number(req.params.id)

    try{
        const user = await prisma.user.findFirst({
            where: {
                id: userID
            },
            select: {
                id: true,
                name: true,
                email: true,
            }
        })

        res.status(200).json({
            message: 'User founded!',
            user: user,
        })

    } catch (error) {
        res.status(500).json({
            message: `User id ${userID} not founded!`,
            error: error.message
        })
    }
})

// READ ALL
app.get('/users', checkToken, async (req, res) => {
    try{
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
            }
        })

        res.status(200).json({
            message: 'Users successfully found!',
            users: users,
        })


    } catch(error){
        res.status(500).json({
            message: 'Failed to receive users!',
            error: error.message
        })
    }
})

// UPDATE
app.put('/user/:id', async (req, res) => {
    const userID = Number(req.params.id)
    const { name, email } = req.body

    try {
        const user = await prisma.user.update({
            where: {
                id: userID
            },
            data: {
                name,
                email
            },
            select: {
                id: true,
                name: true,
                email: true
            }
        })

        res.status(200).json({
            message: 'User successfully updated!',
            user: user
        })

    } catch (error) {
        res.status(500).json({
            message: `Failed to update user with id ${userID}!`,
            error: error.message
        })
    }
})

// DELETE
app.delete('/user/:id', async (req, res) => {
    const userID = Number(req.params.id)

    try {
        await prisma.user.delete({
            where: {
                id: userID
            }
        })

        res.status(200).json({
            message: 'User successfully deleted!'
        })

    } catch (error) {
        res.status(500).json({
            message: `Failed to delete user with id ${userID}!`,
            error: error.message
        })
    }
})

const server = app.listen(PORT, () => {
    console.log(`Server running on ${LOCAL_HOST}`)
})

process.on('SIGINT', async () => {
    await prisma.$disconnect()
    server.close(() => {
        process.exit(0)
    })
})

