import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' });

const app = express();


app.set("view engine","ejs");
app.set("application/javascript", "js");
app.use(express.static(path.join(path.resolve(),"../Frontened/public")));
app.use(cookieParser());
app.use(express.urlencoded({extended:true}));
app.set('views', path.join(path.resolve(), '../Frontened/views'));

mongoose.connect("mongodb://127.0.0.1:27017",{
   dbName : "backened"
}).then(()=>console.log("db connected")).catch(()=>console.log("error"));

const schema  = mongoose.Schema({
   name : String,
   email : String,
   password : String
});

const schema2 = mongoose.Schema({
   login_user_email:String,
   original:String,
   shorten:String
})

const model = mongoose.model("users",schema);
const model2  = mongoose.model("urls",schema2);


app.listen(3000,()=>{
   console.log("working");
})


app.post("/register",async(req,res)=>{
   const {name , email,password} = req.body;

   let user = await model.findOne({email});
   if(user){
      return res.render("register",{message:"Email is already registered"})
   }
   const hashedPassword = await bcrypt.hash(password,10);
   user = await model.create({
      name,
      email,
      password : hashedPassword
   })

   res.render("register",{message:"You have successfully registerd , now login"})

})



const API_KEY = process.env.API_KEY ;

app.post("/short",async(req,res)=>{

   let data = {}
   await fetch("https://api-ssl.bitly.com/v4/shorten",{
      method:"POST",
      headers:{
         "Authorization":"Bearer "+API_KEY+"",
         "Content-Type":"application/json"
      },
      body: JSON.stringify({"long_url":req.body.long_url,"domain":"bit.ly"})
      }).then(res=>res.json()).then(json=>{data=json}).catch(error=>console.log(error))
   
   await model2.create({
      login_user_email:logined_user_email,
      original:data.long_url,
      shorten:data.link
   })

   res.redirect("/")
})



app.post("/login",async(req,res)=>{
   const {email , password} = req.body;

   
   let user = await model.findOne({email});
   if(!user){
      return res.render("login",{msg:"Email not registered"});
   }

   const matched = await bcrypt.compare(password,user.password);
   if(!matched){
      return res.render("login",{msg:"Incorrect password" , email:req.body.email})
   }

   let token = jwt.sign({_id:user._id},"rudra@07");

   res.cookie("token",token,{
      httpOnly:true,
      expires:new Date(Date.now()+300*1000)
   })
   res.redirect("/")

})


let logined_user_email
app.get("/", async (req, res) => {
   const { token } = req.cookies;

   if (token) {
      try {
         const decoded = jwt.verify(token, "rudra@07");
         req.user = await model.findById(decoded._id);
         logined_user_email = req.user.email;

         let count = 0;
         let long_url = [];
         let short_url = [];
         let data_id = [];

         try {
            count = await model2.count({ login_user_email: req.user.email });
            for (var i = 0; i < count; i++) {
               const result1 = await model2.find({ login_user_email: req.user.email }, "original").skip(i).limit(1);
               const result2 = await model2.find({ login_user_email: req.user.email }, "shorten").skip(i).limit(1);
               const result3 = await model2.find({login_user_email:req.user.email},"_id").skip(i).limit(1);

               long_url.push(result1[0].original);
               short_url.push(result2[0].shorten);
               data_id.push(result3[0]._id);

            }
         } catch (err) {
            console.log(err);
         }

         res.render("logout", { name: req.user.name, count, long_url, short_url, data_id });
      } catch (err) {
         console.log(err);
      }
   } else {
      res.render("home");
   }
});


app.get("/login",(req,res)=>{
   res.render("login"); 
})


app.get("/home",async(req,res)=>{
   res.redirect("/");
})


app.get("/register",(req,res)=>{
   res.render("register");
})


app.get("/logout",(req,res)=>{
   res.cookie("token",null,{
      httpOnly:true,
      expires:new Date(Date.now())
   })
   res.redirect("/");
})


app.get("/delete_url/:to_be", async (req, res) => {
   const decodedId = req.params.to_be;
   await model2.deleteOne({_id:decodedId});
   res.redirect("/");
});
