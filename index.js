const mysql = require('mysql');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const cors = require('cors');
const https = require("https");
const hbs = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const fs = require('fs');
const { kStringMaxLength } = require('buffer');

var app = express();
app.use(cors());

//Use body parser for middleware:
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

const options = {
    key: fs.readFileSync(__dirname+"/key.pem"),
    cert: fs.readFileSync(__dirname+"/cert.pem")
}
https.createServer(options,app).listen(process.env.PORT || 3500, function(){
    if(process.env.PORT == undefined){
        console.log("App connected to PORT 3000");
    }
    else{
        console.log("App Connected to PORT " + process.env.PORT);
    }
    
});




const pool = mysql.createPool({
    connectionLimit : 100, //important
    host     : 'db4free.net',
    user     : 'cemilbey',
    password : 'huseyn2004',
    database : 'cemilbey',
    debug    :  false
});

app.get("/", cors()  ,function(req, res){
    pool.query("SELECT * FROM `TEST`", function(err,result,fields){
        if(err) throw err;
        res.json(result);
    });
})

app.post("/submitOrder", function(req,res){
    let data =req.body;

    let uid = data.uid;
    let hash = data.hash;
    let id = data.id;
    let name = data.name;
    let phone = data.phone;
    let address = data.address;
    hash = hash.replace("?r=neworder", "");

    pool.query("SELECT * FROM `uncompletecarts` WHERE `hash`='"+hash+"'", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            console.log(result);
            let totalV = result[0].total;
            let itemsV = result[0].items;
            const date = new Date();
            let day = date.getDate();
            let month = date.getMonth() + 1;
            if(day < 10){
                day = "0"+day;
            }
            if(month < 10){
                month = "0"+month;
            }
            let year = date.getFullYear();
            let currentDate = `${day}-${month}-${year}`;
            pool.query("INSERT INTO `completecarts`(`hash`,`total`, `items`,`date`, `tc`,`name`,`phone`, `address`) VALUES('"+hash+"','"+totalV+"','"+itemsV+"','"+currentDate+"','"+id+"','"+name+"','"+phone+"','"+address+"')", function(err,result,fields){
                if(err){
                    throw err;
                }
                else{
                    res.json({"status": "yes"});
                }
            });
        }
    });
});
app.post("/getCargoStatus", function(req,res){
    let data = req.body;

    let hash = data.hash;

    pool.query("SELECT * FROM `orderStatus` WHERE `hash`='"+hash+"'", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            res.json(result);
        }
    });
});
app.post("/submitUncompleCart", function(req,res){
    let data = req.body;

    let total = data.total;
    let items = data.items;
    let amounts = data.amounts;
    let uid = data.uid;
    let salt = crypto.randomBytes(16).toString('hex'); 
    let hash = crypto.pbkdf2Sync(total+items+amounts+uid, salt,  
    1000, 64, `sha512`).toString(`hex`); 

    pool.query("INSERT INTO `uncompletecarts` (`total`, `items`, `amounts`, `hash`) VALUES('"+total+"','"+items+"','"+amounts+"', '"+hash+"')", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            res.json({"status": "success", "hash": hash});
        }
    });
});
//Get Cart Info:
app.post("/getCartInfo", function(req,res){
    let data = req.body;

    let count = data.count;
    let storageArray = data.storageArray;
    let resultData = [];

    for(let i = 0; i < count; i++){
        pool.query("SELECT * FROM `products` WHERE `id`='"+storageArray[i]+"'", function(err,result,fields){
            if(err){
                throw err;
            }
            else{
                resultData.unshift(result);
                if(i == count - 1){
                    setTimeout(()=>{
                        res.json({result: resultData});
                    },200);
                }
            }
        });
    }
    if(count == "0"){
        res.json({result: resultData});
    }
});
//Registering the user:
app.post("/register", function(req,res,fields){
    let data = req.body;

    let userName = data.name;
    let password = data.password;
    let email = data.email;
    let uid = data.uid;

    let salt = crypto.randomBytes(16).toString('hex'); 
  
    // Hashing user's salt and password with 1000 iterations, 
     
    let hash = crypto.pbkdf2Sync(password, salt,  
    1000, 64, `sha512`).toString(`hex`); 

    pool.query("INSERT INTO `users` (`name`,`email`, `password`, `uid`,`image`, `location`, `phone`,`job`,`age`,`idNumber`,`date`) VALUES ('"+userName+"', '"+email+"', '"+hash+"', '"+uid+"','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6vjzwZaBf6bKmbl7I00WbZ9RPOlriawksgQ&usqp=CAU', '', '', '' ,'' ,'' ,'')", function(err,result,feilds){
        if(err) throw err;
        res.json({"status":"yes"});
    });
});
//Reading the hizmetlerimiz post request:
app.post("/getHizmetlerimiz", function(req,res){
    let data = req.body;

    pool.query("SELECT * FROM `hizmetlerimiz`", function(err,result,fields){
        if(err) throw err;
        res.json(result);
    });
});
//Getting hizmetlerimiz info:
app.post("/getHizmetlerimizInfo", function(req,res){
    let data = req.body;

    pool.query("SELECT * FROM `hizmetlerimizInfo`", function(err,result,fields){
        if(err) throw err;
        res.json(result);
    });
});
//Getting all items:
app.post("/getAllItems", function(req,res){
    let data = req.body;

    let word = "";

    pool.query("SELECT * FROM `items`", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            for(let i = 0; i < result.length; i++){
                if(i == 0){
                    let val = result[i].options;
                    word += val;
                }
                else{
                    let val = result[i].options;
                    word += ","+ val;
                }
            }
            res.json({"item":word});
        }
    });
});
app.post("/addKayitlar", function(req,res){
    let data = req.body;

    const date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    if(day < 10){
        day = "0"+day;
    }
    if(month < 10){
        month = "0"+month;
    }
    let year = date.getFullYear();
    let currentDate = `${day}-${month}-${year}`;
    let result = data.result;
    let uid = data.uid;
    let salt = crypto.randomBytes(16).toString('hex'); 
    let hash = crypto.pbkdf2Sync(result+uid, salt,  
    1000, 64, `sha512`).toString(`hex`); 
    pool.query("INSERT INTO `kayitlar`(`date`, `hash`,`uid`,`result`) VALUES('"+currentDate+"','"+hash+"','"+uid+"','"+result+"')", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            res.json({"status": "success"});
        }
    });
});
app.post("/addForumAdmin", function(req,res){
    let data = req.body;

    let category = data.category;
    let keyword = data.keyword;
    let title = data.title;
    let subtitle = data.subtitle;
    let inputs = data.inputs;
    let type = data.type;

    pool.query("SELECT * FROM `hizmetlerimiz` WHERE `name`='"+category+"'", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            let id = result[0].id;
            let owner = id+"&"+keyword;
            pool.query("INSERT INTO `AraForm`(`owner`,`title`,`subtitle`,`type`,`inputs`,`limitPhoto`)VALUES('"+owner+"','"+title+"', '"+subtitle+"','"+type+"', '"+inputs+"', '0')", function(err,result,fields){
                if(err){
                    throw err;
                }
                res.json({"status": "success"});
            });
        }
    });
});
//Add keyword:
app.post("/addKeywordAdmin", function(req,res){
    let data = req.body;

    let category = data.category;
    let keyword = data.keyword;

    pool.query("SELECT * FROM `hizmetlerimiz` WHERE `name`='"+category+"'", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            let id = result[0].id;
            pool.query("INSERT INTO `items`(`category`, `options`) VALUES('"+id+"','"+keyword+"')", function(err,result,fields){
                if(err){
                    throw err;
                }
                else{
                    res.json({"status": "success"});
                }
            });
        }
    });
});
//Add Service:
app.post("/addServiceAdmin", function(req,res){
    let data = req.body;

    let title = data.title;
    let subtitle = data.subtitle;
    let datato = data.datato;
    let name = data.name;
    let detail = data.detail;
    let mainImage  = data.mainImage;
    let mainimage2 = data.mainimage2;
    let maintitle = data.maintitle;
    let maindetail = data.maindetail;
    console.log(datato);
    pool.query("INSERT INTO `hizmetlerimiz`(`image`, `name`, `detail`) VALUES('"+datato+"','"+name+"','"+detail+"')", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            pool.query("SELECT * FROM `hizmetlerimiz` WHERE `name`='"+name+"'", function(err,result,fields){
                let id = result[0].id;
                pool.query("INSERT INTO `hizmetlerimizInfo`(`id`,`mainImage`, `title1`,`subtitle1`,`mainimage2`,`maintitle`,`maindetail`) VALUES('"+id+"', '"+mainImage+"', '"+title+"', '"+subtitle+"', '"+mainimage2+"','"+maintitle+"', '"+maindetail+"')", function(err,result,fields){
                    if(err){
                        throw err;
                    }
                    else{
                        res.json({"status": "success"});
                    }
                });
            });
        }
    });
});
//Add product:
app.post("/addProductAdmin", function(req,res){
    let data = req.body;

    let image1 = data.image1;
    let image2 = data.image2;
    let image3 = data.image3;
    let image4 = data.image4;
    let image5 = data.image5;
    let image6 = data.image6;
    let image7 = data.image7;
    let image8 = data.image8;
    let image9 = data.image9;
    let harcama = data.harcama;
    let name = data.name;
    let star = data.star;
    let detail = data.detail;
    let price =data.price;
    let brand = data.brand;
    let specifications = data.specifications;

    pool.query("INSERT INTO `products` (`name`, `star`, `detail`, `price`, `brand`, `specifications`, `image1`, `image2`, `image3`, `image4`, `image5`, `image6`, `image7`, `image8`, `image9`, `image10`,`harcama`) VALUES('"+name+"', '"+star+"', '"+detail+"', '"+price+"', '"+brand+"', '"+specifications+"', '"+image1+"', '"+image2+"', '"+image3+"', '"+image4+"', '"+image5+"', '"+image6+"', '"+image7+"', '"+image8+"', '"+image9+"','"+image9+"', '"+harcama+"')", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            res.json({"status":"success"});
        }
    });
});
//Getting the items:
app.post("/getItems", function(req,res){
    let data = req.body;

    let id = data.id;
    pool.query("SELECT * FROM `hizmetlerimizInfo` WHERE `id`='"+id+"'", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            let mainImage = result[0].mainImage;
            let title1 = result[0].title1;
            let subtitle1 = result[0].subtitle1;
            let mainimage2 = result[0].mainimage2;
            let maintitle = result[0].maintitle;
            let maindetail = result[0].maindetail;
            pool.query("SELECT * FROM `items` WHERE `category`='"+id+"'", function(err,result,fields){
                if(err) throw err;
                res.json({result, "mainImage": mainImage, "title1": title1, "subtitle1": subtitle1, "mainimage2":mainimage2, "maintitle": maintitle, "maindetail": maindetail});
            });
        }
    });
});
//Getting the forms:
app.post("/getItemForms",function(req,res){
    let data = req.body;

    let owner = data.owner;

    pool.query("SELECT * FROM `AraForm` WHERE `owner`='"+owner+"'", function(err,result,fields){
        if(err) throw err;
        res.json(result);
    });
});
//Getting the user data:
app.post("/getUserData", function(req,res){
    let data = req.body;

    let uid = data.uid;

    pool.query("SELECT * FROM `users` WHERE `uid` = '"+uid+"'",function(err,result,fields){
        if(err) throw err;
        res.json(result);
    });
});
//Setting the profile image data:
app.post("/setUserProfile", function(req,res){
    let data = req.body;

    let uid = data.uid;
    let url = data.url;

    pool.query("UPDATE `users` SET `image`='"+url+"' WHERE `uid`='"+uid+"'", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            res.json({"status": "success"});
        }
    });
});
//Set profile data:
app.post("/setUserProfileAll", function(req,res){
    let data = req.body;

    let name = data.name;
    let email = data.email;
    let location = data.location;
    let phone = data.phone;
    let job = data.job;
    let age = data.age;
    let idNumber = data.idNumber;
    let date = data.date;
    let uid = data.uid;

    pool.query("UPDATE `users` SET `name`='"+name+"', `email`='"+email+"',`location`='"+location+"',`phone`='"+phone+"',`job`='"+job+"',`age`='"+age+"',`idNumber`='"+idNumber+"',`date`='"+date+"' WHERE `uid`='"+uid+"'", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            res.json({"status": "success"});
        }
    });
});
//Check Ban:
app.post("/checkBan", function(req,res){
    let data = req.body;

    let uid = data.uid;

    pool.query("SELECT * FROM `bannedUsers` WHERE `uid`='"+uid+"'", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            if(result.length == 0){
                res.json({"status": "yes"});
            }
            else{
                res.json(result);
            }
        }
    });
});
//Get Store:
app.post("/getShop", function(req,res){
    let data = req.body;

    let page = data.page;
    let below = (page-1) * 10;

    pool.query("SELECT * FROM `products` WHERE `id`> "+below+" LIMIT 10", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            res.json(result);
        }
    });
});
//Get Store index file: 
app.post("/getShopIndex", function(req,res){
    let data = req.body;

    pool.query("SELECT * FROM `shopTrending`", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            let product1 = result[0].product1;
            let product2 = result[0].product2;
            let product3 = result[0].product3;

            pool.query("SELECT * FROM `products` WHERE `id`= '"+product1+"' OR `id`='"+product2+"' OR `id`='"+product3+"'", function(err,result,fields){
                if(err){
                    throw err;
                }
                else{
                    res.json(result);
                }
            });
        }
    });
});
//Get shop detail:
app.post("/getShopDetail", function(req,res){
    let data = req.body;

    let id = data.id;

    pool.query("SELECT * FROM `products` WHERE `id`='"+id+"'", function(err,result,fields){
        if(err){
            throw err;
        }
        else{
            pool.query("SELECT * FROM `products`", function(err,result0,fields){
                if(err){
                    throw err;
                }
                else{
                    let random1 = Math.floor(Math.random() * result0.length);
                    let random2 = Math.floor(Math.random() * result0.length);
                    let random3 = Math.floor(Math.random() * result0.length);
                    if(random1 == 0){
                        random1 = 1;
                    }
                    if(random2 == 0){
                        random2 = 1;
                    }
                    if(random3 == 0){
                        random3 = 1;
                    }
                    pool.query("SELECT * FROM `products` WHERE `id`='"+random1+"'", function(err,result2,fields){
                        if(err){
                            throw err;
                        }
                        else{
                            pool.query("SELECT * FROM `products` WHERE `id`='"+random2+"'", function(err,result3,fields){
                                if(err){
                                    throw err;
                                }
                                else{
                                    pool.query("SELECT * FROM `products` WHERE `id`='"+random3+"'", function(err,result4,fields){
                                        if(err){
                                            throw err;
                                        }
                                        else{
                                            res.json({result, result2, result3, result4});
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});