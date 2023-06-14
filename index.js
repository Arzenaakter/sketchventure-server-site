const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');

// const stripe = require('stripe')('sk_test_51NIQ3zGuEDjMQT2uj54lJ1u5uNczopceRRU5zjNWMc8N5HmgAp0GPG1ZDFAMP0uIWI29Ilboss1WDDzNq01k6bvi00UYlLMgdJ')
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;



// middleware
app.use(cors())
app.use(express.json())


// verify  token
const verifyJWT = (req, res,next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error:true, message:'unauthorized access'})
  }
  // bearer token
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){

      return res.status(401).send({error:true, message:'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })

}


//mongodb start
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.untmfwa.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    // await client.connect();


    const userCollection = client.db("SummerCampDB").collection('users');
    const classCollection = client.db("SummerCampDB").collection('classes');
    const selectedClassCollection = client.db("SummerCampDB").collection('SelectedClasses');
    const paymentsCollection = client.db("SummerCampDB").collection('payments');

// jwt
app.post('/jwt', (req,res)=>{
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  res.send({token})
})




// use verifyJWT before using verifyAdmin
const verifyAdmin = async ( req, res,next) => {
  const email = req.decoded.email;
  const query = { email: email}
  const user = await userCollection.findOne(query);
  if(user?.role !=='admin' ){
    return res.status(403).send({error:true, message:'forbidden message'});

  }
  next();
}



    // insert data from user
    app.post('/users', async(req,res)=>{
        const users = req.body;

        const query = {email: users.email}
        const existingUser = await userCollection.findOne(query)
       
        if(existingUser){
          return res.send({message : 'Already exists'})
        }


        const result = await userCollection.insertOne(users)
        res.send(result)
    })

// get user all data
app.get('/users',verifyJWT,verifyAdmin, async(req,res)=>{
  const result = await userCollection.find().toArray()
  res.send(result)
})


// get all instructor 
app.get('/users/instructors', async(req, res) => {
  const result = await userCollection.find({role:'instructor'}).toArray()
  res.send(result)
  
});

// all classes
app.get('/AllClasses', async(req,res)=>{
  const result = await classCollection.find({status:'approve'}).toArray()
  res.send(result)
})

// get all user role for select button
app.get('/Allusers/:email',  async(req,res)=>{
  const email = req.params.email;
  const result = await userCollection.find({email}).toArray();
  
  res.send(result)
})


// secure admin route
app.get('/users/admin/:email' ,verifyJWT, async(req,res)=>{
  const email = req.params.email;
  if(req.decoded.email !==email){
    res.send({admin:false})
  }

  const query = {email :email};
  const user = await userCollection.findOne(query)
  const result = {admin:user?.role === 'admin'}
  res.send(result)
})
// secure instructor route
app.get('/users/instructor/:email' ,verifyJWT, async(req,res)=>{
  const email = req.params.email;
  if(req.decoded.email !==email){
    res.send({instructor:false})
  }
  const query = {email :email};
  const user = await userCollection.findOne(query)
  const result = {instructor:user?.role === 'instructor'}
  res.send(result)
})


// patch for update user role admin
app.patch('/users/admin/:id', async(req,res)=>{
  const id = req.params.id;
  const filter = {_id : new ObjectId(id)}
  const updateUser ={
    $set:{
      role:'admin'
    },
  };
  const result = await userCollection.updateOne(filter,updateUser);
  res.send(result)
})

// patch for update user role
app.patch('/users/instructor/:id', async(req,res)=>{
  const id = req.params.id;
  const filter = {_id : new ObjectId(id)}
  const updateUser ={
    $set:{
      role:'instructor'
    },
  };
  const result = await userCollection.updateOne(filter,updateUser);
  res.send(result)
})



    // insert data from add class

    app.post('/addClasses', async(req,res)=>{

      const classes = req.body;
      const result = await classCollection.insertOne(classes);
      res.send(result)
    })

    // get all classes and instructor
app.get('/addClasses', async(req,res)=>{
  const result = await classCollection.find().toArray();
  res.send(result)
})

// get specific user
app.get('/addClasses/:email', verifyJWT,  async(req,res)=>{
  const email = req.params.email;
 
  if(!email){
    res.send([]);
  }
const decodedEmail = req.decoded.email;


if(email !== decodedEmail){
  return res.status(403).send({error: true, message: 'forbidden access'})
}


  const query = {instructorEmail : email}
  const result = await classCollection.find(query).toArray()
  res.send(result)
})

// for approve
app.patch('/addClasses/approve/:id' , async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const updateStatus ={
    $set:{
      status:'approve'
    },
  };
  const result = await classCollection.updateOne(query,updateStatus);
  res.send(result)
})


// for deny
app.patch('/addClasses/deny/:id' , async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const updateStatus ={
    $set:{
      status:'deny'
    },
  };
  const result = await classCollection.updateOne(query,updateStatus);
  res.send(result)
})
// for feedback
app.put('/addClasses/feedback/:id' , async(req,res)=>{
  const id = req.params.id;

  const feedBackData = req.body;
  const query = {_id: new ObjectId(id)}
  const options = { upsert: true };
  const updateFeedBack ={
    $set:{
      feedback:feedBackData.feedback
    },
  };
  const result = await classCollection.updateOne(query,updateFeedBack,options);
  res.send(result)
})

// for update my classses  todo
// app.put('/addClasses/myclass/:id' , async(req,res)=>{
//   const id = req.params.id;
//   console.log(id);

// })
  // selected class collection
  app.post('/selectedClasses' , async(req,res)=>{
    const classes = req.body;
   
    const result = await selectedClassCollection.insertOne(classes);
    res.send(result)
  })
  // selected class get
  app.get('/mySelectedClass', async(req,res)=>{
    const email = req.query.email;
   if(!email){
    res.send([])
   }
    const query = {email : email}
    const result = await selectedClassCollection.find(query).toArray()
    res.send(result);

  })
// Delete selected class 
  app.delete('/mySelectedClass/:id', async(req,res)=>{
    const id = req.params.id;
    const query = {_id : new ObjectId(id)}
    const result = await selectedClassCollection.deleteOne(query);
    res.send(result);
  })
  
// crete payment
app.post('/create-payment-intent', async(req,res)=>{
  const {price} = req.body;
  const amount = price*100;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types : ['card']
  });
  res.send({
    clientSecret :paymentIntent.client_secret
  })

})
// payment
app.post('/payments', verifyJWT, async (req, res) => {
  const payment = req.body;
  const insertedResult = await paymentsCollection.insertOne(payment);

  const query = { _id: new ObjectId(payment.std_id) };
  const deleteResult = await selectedClassCollection.deleteOne(query);

  const classQuery = { _id: new ObjectId(payment.selectedClass_id), availableSeats: { $gt: 0 } };
 
    const classUpdateResult = await classCollection.updateOne(classQuery, { 
      $inc: { 
        availableSeats: -1, // Decrease available seats by 1
        enrolledStudent: 1 // Increase enrolled seats by 1
      }
    })

    res.send({insertedResult,deleteResult,classUpdateResult})

   
});






// get api for payment history
app.get('/payment-history/:email', async(req,res)=>{
  const email = req.params.email;
  const query ={email : email}
  const result = await paymentsCollection.find(query).toArray()
  res.send(result)
})


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



//mongodb end


app.get('/', (req,res)=>{
    res.send('Summer camp server is running')
})
app.listen(port,()=>{
    console.log(`Server is running on : ${port}`);
})