const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config()

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
    await client.connect();


    const userCollection = client.db("SummerCampDB").collection('users')
    const classCollection = client.db("SummerCampDB").collection('classes')

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
  if(user?.role !=='admin'){
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