const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iuz8uzh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}


async function run() {
    try {

        const bikeCollection = client.db('bikeBazar').collection('allBike');
        const bookingCollection = client.db('bikeBazar').collection('bookings');
        const usersCollection = client.db('bikeBazar').collection('users');
        const paymentColl = client.db('bikeBazar').collection('payment');
        


        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

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
                category_id: id
            };
            const cursor = bikeCollection.find(query);
            const bike = await cursor.toArray();
            res.send(bike);
        });


        // Booking
        app.get('/bookings',verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const query = { email: email };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        })


        // users Collection
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '10d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });


        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.delete('/users/:id',verifyJWT,verifyAdmin,  async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

    

        app.get('/buyers', async (req, res) => {
                const query = {};
                const users = await usersCollection.find({role:'Buyer'}).toArray();
                res.send(users);
            });

        app.get('/sellers', async (req, res) => {
                const query = {};
                const users = await usersCollection.find({role:'Seller'}).toArray();
                res.send(users);
            });




            app.put('/users/:email', verifyJWT, async (req, res) => {
                const email = req.params.email;
                const filter = { email }
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        role: 'Buyer'
                    }
                }
                const result = await usersCollection.updateOne(filter, updatedDoc, options);
                res.send(result);
            });

            app.get('/users/admin/:email', async (req, res) => {
                const email = req.params.email;
                const query = { email }
                const user = await usersCollection.findOne(query);
                res.send({ isAdmin: user?.role === 'admin' });
            })

            app.get('/users/buyer/:email', async (req, res) => {
                const email = req.params.email;
                const query = { email }
                const user = await usersCollection.findOne(query);
                res.send({ isBuyer: user?.role === 'Buyer' });
            })

            app.get('/users/seller/:email', async (req, res) => {
                const email = req.params.email;
                const query = { email }
                const user = await usersCollection.findOne(query);
                res.send({ isSeller: user?.role === 'Seller' });
            })

            app.post('/bikes', async (req, res) => {
                const bike = req.body;
                const result = await bikeCollection.insertOne(bike);
                res.send(result);
            });

            app.get('/sellerBike',verifyJWT, async (req, res) => {
                const email = req.query.email;
                const decodedEmail = req.decoded.email;
                if (email !== decodedEmail) {
                    return res.status(403).send({ message: 'forbidden access' });
                }
                const query = { email: email };
                const getBike = await bikeCollection.find(query).toArray();
                res.send(getBike);
            })

            app.delete('/sellerBike/:id',verifyJWT, async (req, res) => {
                const id = req.params.id;
                const filter = { _id: ObjectId(id) };
                const result = await bikeCollection.deleteOne(filter);
                res.send(result);
            })


            app.put('/bikes/seller/:id', verifyJWT,  async (req, res) => {
                const id = req.params.id;
                const filter = { _id: ObjectId(id) }
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        advertise: 'advertise'
                    }
                }
                const result = await bikeCollection.updateOne(filter, updatedDoc, options);
                res.send(result);
            });

            app.get('/advertise', async (req, res) => {
                const query = {}
                const result = await bikeCollection.find({advertise: 'advertise'}).toArray();
                res.send(result);
            });


            app.put('/report/:id', async (req, res) => {
                const id = req.params.id;
                const filter = { _id: ObjectId(id) }
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        report: 'report'
                    }
                }
                const result = await bikeCollection.updateOne(filter, updatedDoc, options);
                res.send(result);
            });

            app.get('/report', async (req, res) => {
                const query = {}
                const result = await bikeCollection.find({report: 'report'}).toArray();
                res.send(result);
            });

            app.delete('/report/:id',verifyJWT, async (req, res) => {
                const id = req.params.id;
                const filter = { _id: ObjectId(id) };
                const result = await bikeCollection.deleteOne(filter);
                res.send(result);
            })


            app.put('/verify/:id', async (req, res) => {
                const id = req.params.id;
                const filter = { 
                    sell_id : id }
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        verify: 'verified'
                    }
                }
                const result = await  bikeCollection.updateMany(filter, updatedDoc, options);


                res.send(result);
            });

            app.post('/create-payment-intent', async (req, res) => {
                const booking = req.body;
                const price = booking.price;
                const amount = price * 100;
    
                const paymentIntent = await stripe.paymentIntents.create({
                    currency: 'usd',
                    amount: amount,
                    "payment_method_types": [
                        "card"
                    ]
                });
                res.send({
                    clientSecret: paymentIntent.client_secret,
                });
            });

            app.post('/payments', async (req, res) =>{
                const payment = req.body;
                const result = await paymentColl.insertOne(payment);
                const id = payment.bookingId
                const filter = {_id: ObjectId(id)}
                const updatedDoc = {
                    $set: {
                        paid: true,
                        transactionId: payment.transactionId
                    }
                }
                const updatedResult = await bookingCollection.updateOne(filter, updatedDoc)
                res.send(result);
            })
    

            app.get('/sell', async (req, res) => {
                const email = req.query.email;
                
                const query = { email: email };
                const bookings = await usersCollection.find(query).toArray();
                res.send(bookings);
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