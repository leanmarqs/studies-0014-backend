import express from 'express'
import { PrismaClient } from '@prisma/client'
import cors from 'cors'

const app = express()
const prisma = new PrismaClient()

const PORT = process.env.PORT

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Main Page')

})

// CREATE
app.post('/register', async (req, res) => {
    const { name, email } = req.body

    try{
        const user = await prisma.user.create({
        data: {
            name,
            email,
        },
        select: {
            id: true,
            name: true,
            email: true,
        }
    })

    res.status(201).json({
        message: 'User successfully created!',
        user: user
    })

    }
    catch(error){
        res.status(500).json({
            message: 'Failed to Create User!',
            error: error.message,
        })
    }

    
})

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
    console.log(`Server running on http://localhost:${PORT}`)
})

process.on('SIGINT', async () => {
    await prisma.$disconnect()
    server.close(() => {
        process.exit(0)
    })
})

