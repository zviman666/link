const express = require('express');
     const fs = require('fs');
     const path = require('path');
     const nodemailer = require('nodemailer');
     const app = express();

     app.use(express.json());
     app.use(express.static('public'));

     const dataFile = path.join(__dirname, 'data.json');
     const recordsFile = path.join(__dirname, 'records.json');

     const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 587,
    secure: false,
    auth: {
        user: '3677049494@qq.com', // 替换为您的 QQ 邮箱
        pass: 'axgronuabtfmchhe'  // 替换为授权码

         }
     });

     // 管理员认证中间件
     const adminAuth = (req, res, next) => {
         const authHeader = req.headers['authorization'];
         if (!authHeader) {
             res.set('WWW-Authenticate', 'Basic realm="Admin"');
             res.status(401).send('Authentication required');
             return;
         }
         const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
         const username = credentials[0];
         const password = credentials[1];
         if (username === 'admin' && password === 'Theocean521144*') {
             next();
         } else {
             res.set('WWW-Authenticate', 'Basic realm="Admin"');
             res.status(401).send('Authentication failed');
         }
     };

     // 读取数据
     const readData = () => {
         return JSON.parse(fs.readFileSync(dataFile));
     };

     // 写入数据
     const writeData = (data) => {
         fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
     };

     // 读取记录
     const readRecords = () => {
         return JSON.parse(fs.readFileSync(recordsFile));
     };

     // 写入记录
     const writeRecords = (records) => {
         fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
     };

     // 检查密码
     app.post('/api/check-password', (req, res) => {
         const { password } = req.body;
         const data = readData();
         const user = data.find(item => item.password === password);

         if (user) {
             const records = readRecords();
             const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
             records.push({
                 password: user.password,
                 nickname: user.nickname,
                 content: user.content,
                 ip,
                 timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
             });
             writeRecords(records);
             res.json({ success: true, content: user.content, nickname: user.nickname });
         } else {
             res.json({ success: false });
         }
     });

     // 获取所有数据
     app.get('/api/data', adminAuth, (req, res) => {
         res.json(readData());
     });

     // 保存或更新数据
     app.post('/api/data', adminAuth, (req, res) => {
         const { password, nickname, content } = req.body;
         const data = readData();
         const index = data.findIndex(item => item.password === password);

         if (index !== -1) {
             data[index] = { password, nickname, content };
         } else {
             data.push({ password, nickname, content });
         }

         writeData(data);
         res.json({ success: true });
     });

     // 删除数据
     app.delete('/api/data/:password', adminAuth, (req, res) => {
         const password = decodeURIComponent(req.params.password);
         const data = readData();
         const newData = data.filter(item => item.password !== password);

         writeData(newData);
         res.json({ success: true });
     });

     // 获取访问记录
     app.get('/api/records', adminAuth, (req, res) => {
         res.json(readRecords());
     });

     // 发送邮件
     app.post('/api/send-email', async (req, res) => {
         const { message } = req.body;
         const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

         const mailOptions = {
             from: '3677049494@qq.com', // 替换为您的 Outlook 邮箱
             to: 'zviman666@gmail.com', // 替换为您的目标邮箱
             subject: '来自网页的邮件',
             text: `用户消息：${message}\n发送者IP：${ip}\n发送时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
         };

         try {
             await transporter.sendMail(mailOptions);
             res.json({ success: true });
         } catch (error) {
             console.error('邮件发送失败:', error);
             res.status(500).json({ success: false, error: '邮件发送失败' });
         }
     });

     // 路由
     app.get('/', (req, res) => {
         res.sendFile(path.join(__dirname, 'public', 'index.html'));
     });

     app.get('/content.html', (req, res) => {
         res.sendFile(path.join(__dirname, 'public', 'content.html'));
     });

     app.get('/admin', adminAuth, (req, res) => {
         res.sendFile(path.join(__dirname, 'public', 'admin.html'));
     });

     const PORT = 3000;
     app.listen(PORT, () => {
         console.log(`Server running on port ${PORT}`);
     });