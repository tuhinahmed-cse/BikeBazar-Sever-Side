const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iuz8uzh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        const bikeCollection = client.db('bikeBazar').collection('allBike');
        const bookingCollection = client.db('bikeBazar').collection('bookings');




        app.get('/allbikes', async (req, res) => {
            const query = {}
            const cursor = bikeCollection.find(query);
            const bikes = await cursor.toArray();
            res.send(bikes);
        });

        app.get('/bikeCategory', async (req, res) => {
            const query = {}
            const cursor = bikeCollection.find(query).project({
                category_title: 1,
                category_id: 1,
                img: 1

            });
            const bikes = await cursor.limit(3).toArray();
            res.send(bikes);
        });

        app.get('/bikes/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                category_id: id };
            const cursor = bikeCollection.find(query);
            const bike = await cursor.toArray();
            res.send(bike);
        });


// Booking

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })


    }

    finally {


    }



}

run().catch(err => console.error(err));






app.get('/', async (req, res) => {
    res.send('used-products-resale-market server is running');
})

app.listen(port, () => console.log(`used-products-resale-market running on ${port}`))