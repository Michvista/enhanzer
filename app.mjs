// Importing required modules
import express from 'express';
import cors from 'cors';
import path from 'path'
import { fileURLToPath } from 'url';
import {v4} from 'uuid'
import multer from "multer"
import fetch from 'node-fetch';
import { fireStorage } from "./firebase-config.js";
import { uploadBytesResumable, getDownloadURL, ref } from "firebase/storage";
import { readFileSync } from 'node:fs';
import { fileFromPath } from 'formdata-node/file-from-path';
import { FormData } from 'formdata-node';
// import FormData from 'form-data'; 
import request from "request";
import fs from"fs"
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import mongodbStore from 'connect-mongodb-session'; 
import db from "./data/database.cjs"

 
const storageConfig = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploadedImages")
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" 
        + file.originalname)
    }
})

const upload = multer({ 
    storage: storageConfig
 })

const __filename = fileURLToPath(import.meta.url)
const app = express();
const MongoDBStore = mongodbStore(session)
const sessionStore = new MongoDBStore({
    uri: 'mongodb+srv://olumidemichelle:michvic09@enhanzer.wzxaxfo.mongodb.net/',
    databaseName: "enhanzer",
    collection: 'sessions'
});

 
app.use(express.json())
app.use(cors())
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "super-secret",
  resave: false,
  saveUninitialized: false,
  store: sessionStore
  // cookie: {
  //   maxAge: 30 * 24 * 60 * 60 * 1000
  // }
}));

let port = 5050;
let nameVar = "";

const __dirname = path.dirname(__filename);

const appDirname = path.resolve(__dirname);

app.use(express.static(path.join(appDirname)));
app.use(express.static(path.join(__dirname)));
app.use(express.static('css'));
app.use(express.static('dist'));
app.use(express.static('images'));

app.use(express.static(`${__dirname}/public`));


app.use('/public/uploadedImages', express.static("public/uploadedImages"))

app.use('/public/Results', express.static("public/Results"))

app.set("view engine", "ejs");

app.use( async(req, res, next) => {
  const user = req.session.user
  const isAuth = req.session.isAuthenticated

  res.locals.isAuth = isAuth

  if (!user || !isAuth) {
    return next()
}

  const userDoc = db.getDb().collection("users").findOne({_id: user.id})
  next()
})    
app.get('/', (req, res) => {
    res.render("index");
})
app.get('/signIn', (req, res) => {
  let inputSessionData = req.session.inputData

  if (!inputSessionData) {
    inputSessionData = {
      hasError: false,
      email: "",
      password: ""
    }
  }

  req.session.inputData = null

  res.render("logIn", {inputData: inputSessionData});;
})
app.post('/signIn', async (req, res) => {
    const userData = req.body
    const enteredEmail = userData.email
    const enteredPassword = userData.password


    const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({email: enteredEmail})

    if (!existingUser) {
      req.session.inputData = {
        hasError:true,
        message: "Could not log in user doesn't exist",
        email:enteredEmail,
        password: enteredPassword
      }
      req.session.save(function () {
         res.redirect("/signIn");
      }) 
      return;
    }

    const equalPasswords =   await bcrypt.compare(enteredPassword, existingUser.password)

    if (!equalPasswords) {
      req.session.inputData = {
        hasError:true,
        message: "Could not logIn - passwords are not equal",
        email:enteredEmail,
        password: enteredPassword
      }
      req.session.save(function () {
         res.redirect("/signIn");
      }) 
      return;
    }
else{
  console.log("loggedIn")
  req.session.user = {
    id: existingUser._id,
    name: existingUser.name,
    email: existingUser.email
  }
  req.session.isAuthenticated = true
  req.session.save(() => {
    res.redirect("/enhanzer")
  })
  return;
}
})
app.get('/signUp', (req, res) => {
   let inputSessionData = req.session.inputData

    if (!inputSessionData) {
      inputSessionData = {
        hasError: false,
        email: "",
        password: ""
      }
    }

    req.session.inputData = null

    res.render("signUp", {inputData: inputSessionData});
})
app.post('/signUp', async (req, res) => {
    const userData = req.body
    const enteredEmail = userData.email
    const enteredName = userData.name

    nameVar = enteredName
    const enteredPassword = userData.password
 


    if (enteredPassword.length < 6 || enteredName.trim().length < 1) {
      req.session.inputData = {
        hasError:true,
        message: "Invalid Data: invalid name / password",
        name: enteredName,
        email:enteredEmail,
        password: enteredPassword
      }
      req.session.save(function () {
         res.redirect("/signUp");
      }) 
        return;
    }

    const existingUser = await db.getDb().collection("users").findOne({email: enteredEmail})

    if(existingUser) {
      console.log("user exists!")
      req.session.inputData = {
        hasError:true,
        message: "User Exists!",
        name: enteredName,
        email:enteredEmail,
        password: enteredPassword
      }
      req.session.save(function () {
         res.redirect("/signUp");
      }) 
      return;
    } 
          const hashedPassword = await bcrypt.hash(enteredPassword, 12);
         
          const user = {
            name: enteredName,
            email: enteredEmail,
            password: hashedPassword
          }
        await db.getDb().collection("users").insertOne(user)
         res.redirect("/signIn");
})
app.get('/enhanzer', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.status(401).render("401")
  }

   let inputSessionData = req.session.user
    res.render("enhanzer", { inputData: inputSessionData });
})
app.post('/getResults', upload.single("myFile"), async (req, res) => {

      // Check if the selectedImage field is empty or "None"
  if (!req.body.selectedImage || req.body.selectedImage === "None") {
    return res.status(400).send("You must select a style!");
  }

    const uploadedImageFile = req.file;
    const userData = req.body
    const fileName = req.file.filename

    const document = {
        optionSelected: userData.selectedImage,
        imagePath: uploadedImageFile.path
      };
    
      await db.getDb().collection('uploads').insertOne(document);

      
      const upload = await db.getDb().collection("uploads").find().sort({_id: -1}).limit(1).toArray()

      const storage = ref(fireStorage, `images/${fileName}}`);
      const metadata = {
        contentType: req.file.mimetype,
      }; 
    //   const imgPath = upload[0].imagePath.replace(/\\/g, '/');
      const snapshot = await uploadBytesResumable(storage, readFileSync(upload[0].imagePath), metadata);
      const downloadUrl =  await getDownloadURL(snapshot.ref);

//2d
        const API_KEY = "sc-b2f9c9c1ff7db434e53aa51180bc686bace04bbe0f0a44a952cc4276e57bcdde";
        const API_HOST = 'https://api.stablecog.com';
        const ENDPOINT = '/v1/image/generate';
        const ENDPOINTFORUPLOAD = '/v1/image/upload';
        const API_URLForUpload = `${API_HOST}${ENDPOINTFORUPLOAD}`;
        const API_URL = `${API_HOST}${ENDPOINT}`;

        let url = "";
                    // 2d
        if (upload[0].optionSelected === "cartoon") {
            const processRequest = async () => {
              let uploadedImageUrl = "";
          
              const uploadFile = async () => {
                const filePath = `${upload[0].imagePath}`;
                const formData = new FormData();
                formData.set('file', await fileFromPath(filePath));
          
                const resultOfUpload = await fetch(API_URLForUpload, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${API_KEY}`,
                  },
                  body: formData,
                });
                const resultOfUploadJSON = await resultOfUpload.json();
                uploadedImageUrl = resultOfUploadJSON.object;
              };
          
              await uploadFile();
          
              const request = {
                prompt: '2d illustrated animated character',
                model_id: 'b6c1372f-31a7-457c-907c-d292a6ffef97',
                width: 768,
                height: 768,
                num_outputs: 1,
                guidance_scale: 7,
                inference_steps: 30,
                scheduler_id: '6fb13b76-9900-4fa4-abf8-8f843e034a7f',
                init_image_url: uploadedImageUrl,
                seed: 1333735331
              };
          
              const result = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(request),
                headers: {
                  Authorization: `Bearer ${API_KEY}`,
                  'Content-Type': 'application/json',
                },
              });
           
              const resJSON = await result.json();
            //   console.log(resJSON)
              return JSON.stringify(resJSON.outputs);
            };
          
            const firstOutputUrl = await processRequest();
            const parsedOutputUrl = JSON.parse(firstOutputUrl);
             url = parsedOutputUrl[0].url;
            // return res.render("results", { upload: upload, outputUrl: firstOutputUrl });
          }
          
        //   3d
  
        if (upload[0].optionSelected === "3d") {
            const processRequest = async () => {
              let uploadedImageUrl = "";
          
              const uploadFile = async () => {
                const filePath = `${upload[0].imagePath}`;
                const formData = new FormData();
                 formData.set('file', await fileFromPath(filePath));
                
                const resultOfUpload = await fetch(API_URLForUpload, {
               method: 'POST',
                  headers: {
                    Authorization: `Bearer ${API_KEY}`,
                  },
                   body: formData,
                });
                const resultOfUploadJSON = await resultOfUpload.json();
                uploadedImageUrl = resultOfUploadJSON.object;
              };
          
              await uploadFile();
          
              const request = {
                prompt: 'Create a 3d render of this image',
                model_id: 'eaa438e1-dbf9-48fd-be71-206f0f257617',
                width: 512,
                height: 768,
                num_outputs: 1,
                guidance_scale: 10,
                inference_steps: 40,
                negative_prompt: "blurry, old, ancient, aging, gray",
                scheduler_id: '6fb13b76-9900-4fa4-abf8-8f843e034a7f',
                init_image_url: uploadedImageUrl,
                seed: 1251534394
              };
          
              const result = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(request),
                headers: {
                  Authorization: `Bearer ${API_KEY}`,
                  'Content-Type': 'application/json',
                },
              });
            
              const resJSON = await result.json();
            //   console.log(resJSON)
              return JSON.stringify(resJSON.outputs);
            };
          
            const firstOutputUrl = await processRequest();
            const parsedOutputUrl = JSON.parse(firstOutputUrl);
             url = parsedOutputUrl[0].url;
            // return res.render("results", { upload: upload, outputUrl: firstOutputUrl });
          }

        //   removeBg
        if (upload[0].optionSelected === "removeBg") {
          
          const settings = {
            url: "https://api.slazzer.com/v2.0/remove_image_background",
            apiKey: "10af83f91efa44a9bdbdc5fded1f60d9",
            sourceImagePath: `${upload[0].imagePath}`,
            outputImagePath: `public/Results/outputRes.png`
          };
          
          request.post(
            {
              url: settings.url,
              formData: {source_image_file: fs.createReadStream(settings.sourceImagePath),},
              headers: {"API-KEY": settings.apiKey,},
              encoding: null,
            },
            function (error, response, body) {
              if(error){ console.log(error); return;}
              if(response.statusCode != 200){ console.log(body.toString('utf8')); return; }
              fs.writeFileSync(settings.outputImagePath, body);
          }
          );   
         url = settings.outputImagePath
        }
        
        
    
        // generation models:

        // const resultTwo = await fetch(API_URL);
        // const resJSONTwo = await resultTwo.json();
        
        // console.log(resJSONTwo); // Add this line to inspect the response structure
        
        // // Iterate over each model
        // resJSONTwo.models.forEach(model => {
        //   const availableSchedulers = model.available_schedulers;
        //   console.log(`Model: ${model.name}`);
        //   console.log(`Available Schedulers: ${JSON.stringify(availableSchedulers, null, 2)}`);
        //   console.log("-------------------");
        // });
        
        return res.render("results", {upload: upload, outputUrl: url});      
})
app.post("/logOut", (req, res) => {
  req.session.user = null;
  req.session.isAuthenticated = false
  res.redirect("/")
})
app.get('/furtherEnhancement', (req, res) => {
    const outputUrl = req.query.outputUrl;
    let inputSessionData = req.session.user

    res.render("furtherEnhancement", { outputUrl: outputUrl, inputData: inputSessionData })
})
app.use(function (req, res) {
  res.status(404).render('404'); // Render the 404 view
});
 
db.connectDatabase().then(function () {
    app.listen(port)
    console.log("listening")
})

