import express from 'express'
import { PrismaClient } from '@prisma/client'
import cors from 'cors'
import { z } from "zod";
import bcrypt from "bcryptjs";

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

// 🔹 Rota de criação de usuário
app.post("/register", async (req, res) => {
  const userSchema = z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      confirmPassword: z.string(),
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

    const hashed = await bcrypt.hash(password, 10);

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


// READ
app.get('/user/:id', async (req, res) => {
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
app.get('/users', async (req, res) => {
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
    console.log(`Server running on ${GLOBAL_HOST}`)
})

process.on('SIGINT', async () => {
    await prisma.$disconnect()
    server.close(() => {
        process.exit(0)
    })
})

