import Telegraf from 'telegraf';
import session from 'telegraf-session';
import Redis from 'ioredis';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('db.sqlite');
const redisClient = new Redis();

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password TEXT,
  role TEXT
)`);

// Создание таблицы users, если она не существует
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password TEXT,
  role TEXT
)`);
const bot = new Telegraf('6116990894:AAHoDSJ13O-PUrvSWHNagEtmx6uPZHknwdI');

/// Обработчик команды /start

bot.use(session({ store: new session.RedisStore(redisClient) }));

bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const user = await getUser(chatId);

    if (user) {
        ctx.reply('Введите пароль:');
        ctx.session.user = user;
        ctx.session.state = 'password';
    } else {
        ctx.reply('Введите логин:');
        ctx.session.state = 'username';
    }
});

bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;
    const state = ctx.session.state;

    if (state === 'username') {
        ctx.reply('Введите пароль:');
        ctx.session.user = { username: text };
        ctx.session.state = 'password';
    } else if (state === 'password') {
        const user = ctx.session.user;
        user.password = text;

        const existingUser = await getUser(user.username);
        if (existingUser) {
            if (existingUser.password === user.password) {
                ctx.reply('Вы успешно вошли в аккаунт.');
            } else {
                ctx.reply('Неверный пароль. Попробуйте еще раз.');
            }
        } else {
            db.run(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                user.username,
                user.password,
                'teacher',
                (err) => {
                    if (err) {
                        console.error(err);
                        ctx.reply('Произошла ошибка при регистрации.');
                    } else {
                        ctx.reply('Вы успешно зарегистрированы.');
                    }
                }
            );
        }

        ctx.session = null;
    }
});

bot.launch();

function getUser(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', username, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}