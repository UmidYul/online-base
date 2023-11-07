import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import express from 'express'
import bodyParser from 'body-parser'
import session from 'express-session';
import path from "path"
import formidable from 'formidable'
import fs from "fs"

const app = express()
const PORT = 3000
const __dirname = dirname(fileURLToPath(import.meta.url))
const file = join(__dirname, 'db.json')
const adapter = new JSONFile(file)
const defaultData = { logins: [], users: [] }
const db = new Low(adapter, defaultData)

app.use(express.static(__dirname + "/public/"))
app.use(bodyParser.json({ type: 'application/json' }))
app.use(bodyParser.urlencoded({ extended: false }))

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

const authMiddleware = (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/');
    }
};

app.get('/', function (req, res) {
    if (req.session.authenticated == true) {
        res.redirect(`/user:${req.session.userId}`)
    } else {
        res.sendFile(__dirname + "/views/login.html")
    }
})
app.get("/user:id/class:id/student:id", authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/student.html")
})
app.get("/user:id/class:id", authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/class.html")
})

app.get('/user:id', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/user.html")
})

app.get('/user:id/class:id/add-student', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/add_student.html")
})

app.get('/user:id/class:id/profile', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/profile.html")
})

app.post('/add-student', async function (req, res) {
    const id = Date.now().toString()
    await db.read()
    const { users } = db.data
    const form1 = formidable({ multiples: false });
    for (let i = 0; i < users.length; i++) {
        const el = users[i].info;
        if (el.id == req.session.userId) {
            form1.parse(req, (err, fields, files) => {
                // f(fields, el.id)
                // if (err) {
                //     console.log(err);
                // }
                if (files.img) {
                    const oldPath = files.img[0].filepath;
                    const newPath = path.join(__dirname, '/public/images/student/', `${id}.webp`);
                    fs.rename(oldPath, newPath, (error) => {
                        if (error) {
                            res.status(500).json({ error: 'Ошибка при сохранении файла' });
                            return;
                        }
                    });
                    x(fields, `/images/student/${id}.webp`)
                } else {
                    x(fields, "/images/error/error.webp")
                }
            });
            function x(log, img) {
                el.students.push({
                    id: id,
                    img: img,
                    student_name: log.student_name[0],
                    student_birth_date: log.student_birth_date[0],
                    student_accept_date: log.student_accept_date[0],
                    document_type: log.document_type[0],
                    serial_number: log.student_serial_number[0],
                    student_tel: log.student_tel[0],
                    student_adress: log.student_adress[0],
                    student_mahalla: log.student_mahalla[0],
                    family_status: log.family_status[0],
                    student_attraction: log.student_attraction[0],
                    student_health_status: log.student_health_status[0],
                    mother: {
                        mother_name: log.mother_name[0],
                        mother_serial_number: log.mother_serial_number[0],
                        mother_birth_date: log.mother_birth_date[0],
                        mother_adress: log.mother_adress[0],
                        mother_mahalla: log.mother_mahalla[0],
                        mother_tel: log.mother_tel[0],
                        mother_workplace: log.mother_workplace[0]
                    },
                    father: {
                        father_name: log.father_name[0],
                        mother_serial_number: log.mother_serial_number[0],
                        father_birth_date: log.father_birth_date[0],
                        father_adress: log.father_adress[0],
                        father_mahalla: log.father_mahalla[0],
                        father_tel: log.father_tel[0],
                        father_workplace: log.father_workplace[0]
                    }
                })
                db.write()
                res.redirect(`/user:${el.id}`)
            }

        }
    }
})
app.post('/logout', function (req, res) {
    const { data } = req.body
    req.session.authenticated = data
    res.redirect("/")
})
app.get('/user:id/add-class', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/add_class.html")
})

app.post('/add-class', async function (req, res) {
    const form = formidable({ multiples: false });
    await db.read()
    const { logins, users } = db.data
    const id = Date.now().toString()
    form.parse(req, (err, fields, files) => {
        if (files.img) {
            const oldPath = files.img[0].filepath;
            const newPath = path.join(__dirname, '/public/images/stuff/', `${id}.webp`);
            fs.rename(oldPath, newPath, (error) => {
                if (error) {
                    res.status(500).json({ error: 'Ошибка при сохранении файла' });
                    return;
                }
            });
            f(fields, "/images/stuff/" + `${id}.webp`)
        } else {
            f(fields, "/images/error/error.webp")
        }
    });
    function f(log, img) {
        logins.push({
            id: id,
            login: log.log[0],
            password: log.pass[0],
        })
        users.push({
            info: {
                id: id,
                name: log.name[0],
                class_num: log.class_num[0],
                class_letter: log.letter[0],
                img: img,
                subject: log.subject[0],
                role: "teacher",
                students: []
            }
        })
        db.write()
        res.redirect(`/user:${req.session.userId}`)
    }
})

app.post("/login-api", async function (req, res) {
    const { log, pass } = req.body
    await db.read()
    const { logins, users } = db.data
    const user = logins.find(({ login }) => login == log)
    if (user) {
        if (user.password === pass) {
            req.session.authenticated = true;
            for (let i = 0; i < users.length; i++) {
                const el = users[i].info;
                if (el.id == user.id) {
                    res.redirect(`/user:${el.id}`)
                }
            }
        } else {
            res.redirect("/")
        }
    } else {
        res.redirect("/")
    }
})
app.post("/id", async function (req, res) {
    const { data } = req.body
    await db.read()
    const { users } = db.data
    for (let i = 0; i < users.length; i++) {
        const el = users[i].info;
        if (el.id == data) {
            req.session.userId = el.id
            res.send(JSON.stringify({ el, users }))
        }
    }
})
app.post("/classid", async function (req, res) {
    const { data } = req.body
    await db.read()
    const { users, logins } = db.data
    for (let i = 0; i < users.length; i++) {
        const el = users[i].info;
        const ex = logins[i];
        if (el.id == data & ex.id == data) {
            res.send(JSON.stringify({ el, ex }))
        }
    }
})
app.post("/studentid", async function (req, res) {
    const { sid, cid } = req.body
    await db.read()
    const { users } = db.data
    for (let i = 0; i < users.length; i++) {
        const el = users[i].info;
        if (el.id == cid) {
            for (let e = 0; e < el.students.length; e++) {
                const x = el.students[e];
                if (x.id == sid) {
                    res.send(JSON.stringify({ x }))
                }
            }
        }
    }
})
app.post("/remove/student", async function (req, res) {
    const { uid, sid, cid } = req.body
    await db.read()
    const { users } = db.data
    for (let i = 0; i < users.length; i++) {
        const el = users[i].info;
        if (el.id == cid) {
            for (let e = 0; e < el.students.length; e++) {
                const x = el.students[e];
                if (x.id == sid) {
                    let responseSent = false;
                    users.forEach(element => {
                        if (element.info.students && Array.isArray(element.info.students)) {
                            const index = element.info.students.findIndex(user => user.id == sid);
                            element.info.students.splice(index, 1);
                            db.write();
                            if (!responseSent) {
                                res.send(JSON.stringify({ url: `/user:${uid}/class:${cid}` }));
                                responseSent = true;
                            }
                        } else {
                            if (!responseSent) {
                                res.send(JSON.stringify({ url: `/user:${uid}/class:${cid}/student:${sid}` }));
                                responseSent = true;
                            }
                        }
                    });
                    fs.unlink(__dirname + `/public/images/student/${sid}.webp`, (err) => { if (err) throw err; });
                }
            }
        }
    }
})

app.post("/remove/class", async function (req, res) {
    const { uid, cid } = req.body
    await db.read()
    const { users, logins } = db.data
    for (let i = 0; i < users.length; i++) {
        const el = users[i].info;
        if (el.id == cid) {
            let responseSent = false;
            const usersIndex = users.findIndex(user => user.info.id == cid);
            const loginsIndex = logins.findIndex(login => login.id == cid);
            users.splice(usersIndex, 1)
            logins.splice(loginsIndex, 1)
            db.write()
            if (!responseSent) {
                res.send(JSON.stringify({ url: `/user:${uid}` }));
                responseSent = true;
            }
            fs.unlink(__dirname + `/public/images/stuff/${cid}.webp`, (err) => { if (err) console.log("err");; });
        }
    }
})

app.listen(PORT, console.log(`http://localhost:${PORT}`))