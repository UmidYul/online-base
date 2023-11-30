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
import moment from "moment";

const app = express()
const PORT = 5000
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
        res.redirect('/')
    }
};
async function listener() {
    await db.read()
    const { users } = db.data
    const now = moment();
    let year = +now.format('YYYY')
    let yearMonth = year + "_09_" + Number(year + 1) + "_05"
    if (users[users.length - 1].period != yearMonth) {
        const lastUser = users[users.length - 1];
        const newClassNum = 1;
        const newInfo = lastUser.info.map(item => ({
            info: {
                ...item.info,
                class_num: Number(item.info.class_num) + newClassNum
            }
        }));
        const newUser = {
            period: yearMonth,
            info: newInfo
        };
        users.push(newUser);
        db.write();
        users
    }
    return yearMonth
}
app.get('/', async function (req, res) {
    req.session.period = await listener()
    if (req.session.authenticated == true) {
        res.redirect(`/period:${req.session.period}/user:${req.session.userId}`)
    } else {
        res.sendFile(__dirname + "/views/login.html")
    }
})
app.post("/date", async (req, res) => {
    await db.read()
    const { users } = db.data
    res.send({ date: users[users.length - 1].period })
})
app.get("/period:date/user:id/class:id/student:id", authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/student.html")
})
app.get("/period:date/user:id/class:id/student:id/edit", authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/edit-student.html")
})
app.get("/period:date/user:id/class:id", authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/class.html")
})

app.get('/period:date/user:id', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/user.html")
})

app.get('/user:id/class:id/add-student', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/add_student.html")
})

app.get('/period:date/user:id/class:id/stuff-profile', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/profile.html")
})

app.get('/period:date/user:id/class:id/stuff-profile/edit', authMiddleware, function (req, res) {
    res.sendFile(__dirname + "/views/edit-profile.html")
})

app.post('/add-student', async function (req, res) {
    const id = Date.now().toString()
    await db.read()
    const { users } = db.data
    const form1 = formidable({ multiples: false });
    let responseSent = false;
    let saved = false;
    const index = users.length - 1
    users[index].info.forEach(e => {
        for (let i = 0; i < users[index].info.length; i++) {
            const el = e.info
            if (el.id == req.session.classId) {
                form1.uploadDir = "/home/onlineb5/online-base.uz/tmp"
                form1.parse(req, (err, fields, files) => {
                    if (files.img) {
                        const oldPath = files.img[0].filepath;
                        const newPath = path.join(__dirname, '/public/images/student/', `${id}.webp`);
                        if (!saved) {
                            fs.rename(oldPath, newPath, (error) => {
                                if (error) {
                                    console.log(error);
                                }
                            });
                            x(fields, `/images/student/${id}.webp`)
                            saved = true
                        }
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
                            father_serial_number: log.father_serial_number[0],
                            father_birth_date: log.father_birth_date[0],
                            father_adress: log.father_adress[0],
                            father_mahalla: log.father_mahalla[0],
                            father_tel: log.father_tel[0],
                            father_workplace: log.father_workplace[0]
                        }
                    })
                    if (!responseSent) {
                        db.write()
                        res.redirect(`/period:${req.session.period}/user:${req.session.userId}/class:${req.session.classId}`)
                        responseSent = true;
                    }
                }

            }
        }
    });
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
    let saved = false
    form.uploadDir = "/home/onlineb5/online-base.uz/tmp"
    form.parse(req, (err, fields, files) => {
        if (files.img) {
            if (!saved) {
                const oldPath = files.img[0].filepath;
                const newPath = path.join(__dirname, '/public/images/stuff/', `${id}.webp`);
                fs.rename(oldPath, newPath, (error) => {
                    if (error) {
                        res.status(500).json({ error: 'Ошибка при сохранении файла' });
                        return;
                    }
                });
                console.log(files.img[0].filepath);
                // f(fields, "/images/stuff/" + `${id}.webp`)
                // saved = true
            }
        } else {
            if (!saved) {
                // f(fields, "/images/error/error.webp")
                // saved = true
            }
        }
    });
    function f(log, img) {
        logins.push({
            id: id,
            login: log.log[0],
            password: log.pass[0],
        })
        users[users.length - 1].info.push({
            info: {
                id: id,
                name: log.name[0],
                class_num: Number(log.class_num[0]),
                class_letter: log.letter[0],
                img: img,
                role: "teacher",
                students: []
            }
        })
        db.write()
        if (!req.session.period) {
            res.redirect(`/period:${users[users.length - 1].period}/user:${req.session.userId}`)
        } else {
            res.redirect(`/period:${req.session.period}/user:${req.session.userId}`)
        }
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
            let responseSent = false
            users.forEach(e => {
                for (let i = 0; i < e.info.length; i++) {
                    const el = e.info[i].info;
                    if (el.id == user.id) {
                        if (!responseSent) {
                            res.send(JSON.stringify({ link: `/period:${users[users.length - 1].period}/user:${el.id}` }))
                            // res.redirect(`/period:${users[users.length - 1].period}/user:${el.id}`)
                            responseSent = true;
                        }
                    }
                }
            });
        } else {
            res.send(JSON.stringify({ err: ["Неправильный Пароль!", "Попробуйте снова или", "обратитесь к администратору."] }))
        }
    } else {
        res.send(JSON.stringify({ err: ["Неправильный Логин!", "Попробуйте снова или", "обратитесь к администратору."] }))
    }
})
app.post("/id", async function (req, res) {
    const { data } = req.body
    await db.read()
    const { users } = db.data
    let responseSent = false
    for (let i = 0; i < users[users.length - 1].info.length; i++) {
        const el = users[users.length - 1].info[i].info;
        if (el.id == data) {
            req.session.userId = el.id
            if (!responseSent) {
                res.send(JSON.stringify({ el, users }))
                responseSent = true;
            }
        }
    }
})
app.post("/classid", async function (req, res) {
    const { id, period } = req.body
    await db.read()
    const { users, logins } = db.data
    let responseSent = false
    const index = users.findIndex(user => user.period == period);
    users[index].info.forEach(e => {
        for (let i = 0; i < users[index].info.length; i++) {
            const el = e.info;
            const ex = logins[i];
            if (el.id == id & ex.id == id) {
                req.session.classId = el.id
                if (!responseSent) {
                    res.send(JSON.stringify({ el, ex }))
                    responseSent = true;
                }
            }
        }
    });
})
app.post("/studentid", async function (req, res) {
    const { sid, cid, period } = req.body
    await db.read()
    const { users } = db.data
    const index = users.findIndex(user => user.period == period);
    let responseSent = false
    users[index].info.forEach(e => {
        for (let i = 0; i < users[index].info.length; i++) {
            const el = e.info;
            if (el.id == cid) {
                for (let z = 0; z < el.students.length; z++) {
                    const x = el.students[z];
                    if (x.id == sid) {
                        if (!responseSent) {
                            res.send(JSON.stringify({ x }))
                            responseSent = true;
                        }
                    }
                }
            }
        }
    });
})
app.post("/remove/student", async function (req, res) {
    const { uid, sid, cid, period } = req.body
    await db.read()
    const { users } = db.data
    const index = users.findIndex(user => user.period == period);
    let responseSent = false;
    users[index].info.forEach(e => {
        for (let i = 0; i < users[index].info.length; i++) {
            const el = e.info;
            if (el.id == cid) {
                for (let z = 0; z < el.students.length; z++) {
                    const x = el.students[z];
                    if (x.id == sid) {
                        if (e.info.students && Array.isArray(e.info.students)) {
                            if (!responseSent) {
                                const index = e.info.students.findIndex(user => user.id == sid);
                                e.info.students.splice(index, 1);
                                db.write();
                                console.log(users.length);
                                if (users.length < 1) {
                                    fs.unlink(__dirname + `/public/images/student/${sid}.webp`, (err) => { if (err) throw err; });
                                }
                                res.send(JSON.stringify({ url: `/period:${req.session.period}/user:${uid}/class:${cid}` }));
                                responseSent = true;
                            }
                        }
                    }
                }
            }
        }
    });
})

app.post("/remove/class", async function (req, res) {
    const { uid, cid } = req.body
    await db.read()
    const { users, logins } = db.data
    let responseSent = false;
    users[users.length - 1].info.forEach(e => {
        const el = e.info;
        if (users[users.length - 1].info.findIndex(user => user.info.id == cid) == -1) {
            if (!responseSent) {
                res.send(JSON.stringify({ err: ["Не удалось удалить класс!"] }))
                responseSent = true;
            }
        }
        if (el.id == cid) {
            if (!responseSent) {
                const usersIndex = users[users.length - 1].info.findIndex(user => user.info.id == cid);
                const loginsIndex = logins.findIndex(login => login.id == cid);
                users[users.length - 1].info.splice(usersIndex, 1)
                logins.splice(loginsIndex, 1)
                db.write()
                if (users.length < 1) {
                    fs.unlink(__dirname + `/public/images/stuff/${cid}.webp`, (err) => {
                        if (err) res.send(JSON.stringify({ err: ["Не удалось удалить класс!"] }))
                    });
                }
                res.send(JSON.stringify({ link: `/period:${req.session.period}/user:${uid}` }));
                responseSent = true;
            }
        }

    });
})
app.post("/editClass", async function (req, res) {
    await db.read()
    const { users, logins } = db.data
    const form = formidable({ multiples: false });
    form.uploadDir = "/home/onlineb5/online-base.uz/tmp"

    form.parse(req, (err, fields, files) => {
        setTimeout(() => {
            if (files.img) {
                let responseSent = false
                let saved = false
                users[users.length - 1].info.forEach(e => {
                    const usersIndex = users[users.length - 1].info.findIndex(user => user.info.id == fields.cid);
                    const loginsIndex = logins.findIndex(login => login.id == fields.cid);
                    logins[loginsIndex].password = fields.pass[0]
                    users[users.length - 1].info[usersIndex].info.name = fields.name[0]
                    users[users.length - 1].info[usersIndex].info.class_num = Number(fields.num[0])
                    users[users.length - 1].info[usersIndex].info.class_letter = fields.letter[0]
                    const oldPath = files.img[0].filepath;
                    const newPath = path.join(__dirname, '/public/images/stuff/', `${fields.cid}.webp`);
                    if (!saved) {
                        fs.unlink(__dirname + `/public/images/stuff/${fields.cid}.webp`, (err) => { if (err) res.send("Ошибка пожалуйста обратитесь в поддержку!") });
                        fs.rename(oldPath, newPath, (error) => { if (error) res.status(500).json({ error: 'Ошибка пожалуйста обратитесь в поддержку!' }); return; });
                        db.write()
                        saved = true
                    }
                    if (!responseSent & saved == true) {
                        res.redirect(`/period:${req.session.period}/user:${req.session.userId}/class:${fields.cid[0]}/stuff-profile`)
                        responseSent = true;
                    }
                });
            } else {
                users[users.length - 1].info.forEach(e => {
                    const usersIndex = users[users.length - 1].info.findIndex(user => user.info.id == fields.cid);
                    const loginsIndex = logins.findIndex(login => login.id == fields.cid);
                    logins[loginsIndex].password = fields.pass[0]
                    users[users.length - 1].info[usersIndex].info.name = fields.name[0]
                    users[users.length - 1].info[usersIndex].info.class_num = Number(fields.num[0])
                    users[users.length - 1].info[usersIndex].info.class_letter = fields.letter[0]
                    db.write()
                    if (!responseSent) {
                        res.redirect(`/period:${req.session.period}/user:${req.session.userId}/class:${fields.cid[0]}/stuff-profile`)
                        responseSent = true;
                    }
                });
            }
        }, 200);
    });
})
app.post("/editStudent", async function (req, res) {
    await db.read()
    const { users, logins } = db.data
    const form = formidable({ multiples: false });
    let responseSent = false
    let saved = false
    form.uploadDir = "/home/onlineb5/online-base.uz/tmp"

    form.parse(req, (err, fields, files) => {
        if (files.img) {
            users[users.length - 1].info.forEach(e => {
                const userIndex = users[users.length - 1].info.findIndex(user => user.info.id == fields.cid);
                const studentsIndex = users[users.length - 1].info[userIndex].info.students.findIndex(user => user.id == fields.sid[0]);
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_name = fields.student_name[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_birth_date = fields.student_birth_date[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].serial_number = fields.serial_number[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_tel = fields.student_tel[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_adress = fields.student_adress[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_mahalla = fields.student_mahalla[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].family_status = fields.family_status[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_attraction = fields.student_attraction[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_health_status = fields.student_health_status[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_name = fields.mother_name[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_serial_number = fields.mother_serial_number[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_birth_date = fields.mother_birth_date[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_adress = fields.mother_adress[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_mahalla = fields.mother_mahalla[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_tel = fields.mother_tel[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_workplace = fields.mother_workplace[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_name = fields.mother_name[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_serial_number = fields.mother_serial_number[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_birth_date = fields.mother_birth_date[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_adress = fields.mother_adress[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_mahalla = fields.mother_mahalla[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_tel = fields.mother_tel[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_workplace = fields.mother_workplace[0]
                const oldPath = files.img[0].filepath;
                const newPath = path.join(__dirname, '/public/images/student/', `${fields.sid}.webp`);
                if (!saved) {
                    fs.unlink(__dirname + `/public/images/student/${fields.sid}.webp`, (err) => { if (err) res.send("Ошибка пожалуйста обратитесь в поддержку!") });
                    fs.rename(oldPath, newPath, (error) => { if (error) console.log(error) });
                    db.write()
                    saved = true
                }
                if (!responseSent & saved == true) {
                    res.redirect(`/period:${req.session.period}/user:${req.session.userId}/class:${fields.cid[0]}/student:${fields.sid[0]}`)
                    responseSent = true;
                }
            });

        } else {
            users.forEach(e => {
                const userIndex = users[users.length - 1].info.findIndex(user => user.info.id == fields.cid);
                const studentsIndex = users[users.length - 1].info[userIndex].info.students.findIndex(user => user.id == fields.sid[0]);
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_name = fields.student_name[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_birth_date = fields.student_birth_date[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].serial_number = fields.serial_number[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_tel = fields.student_tel[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_adress = fields.student_adress[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_mahalla = fields.student_mahalla[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].family_status = fields.family_status[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_attraction = fields.student_attraction[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].student_health_status = fields.student_health_status[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_name = fields.mother_name[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_serial_number = fields.mother_serial_number[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_birth_date = fields.mother_birth_date[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_adress = fields.mother_adress[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_mahalla = fields.mother_mahalla[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_tel = fields.mother_tel[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].mother.mother_workplace = fields.mother_workplace[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_name = fields.mother_name[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_serial_number = fields.mother_serial_number[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_birth_date = fields.mother_birth_date[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_adress = fields.mother_adress[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_mahalla = fields.mother_mahalla[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_tel = fields.mother_tel[0]
                users[users.length - 1].info[userIndex].info.students[studentsIndex].father.father_workplace = fields.mother_workplace[0]
                db.write()
                if (!responseSent) {
                    res.redirect(`/period:${req.session.period}/user:${req.session.userId}/class:${fields.cid[0]}/student:${fields.sid[0]}`)
                    responseSent = true;
                }
            });
        }
    });
})
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`)
    setInterval(() => {
        listener()
    }, 1000 * 60 * 60 * 24);
})
