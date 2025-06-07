const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
// 示例一个假的 ObjectId 字符串，长度24位十六进制
const fakeAuthorId = new mongoose.Types.ObjectId();



// 初始化 express 应用
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB 连接（本地或云端）
mongoose.connect('mongodb://127.0.0.1:27017/blog-messages', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// 定义 Schema 和 Model
const messageSchema = new mongoose.Schema({
    content: String,
    articleId: String, // 👈 新增字段：文章标识
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null }, // 父评论ID
    likes: { type: Number, default: 0 },
    username: { type: String, default: "匿名用户" },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// 新增文章模型
const articleSchema = new mongoose.Schema({
    title: String,
    content: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    category: String, // 如"日记"、"政治"等
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    published: { type: Boolean, default: false }
});

const Article = mongoose.model('Article', articleSchema);

// 获取评论树
// 获取评论树（按 articleId 过滤）
app.get('/messages', async (req, res) => {
    const { articleId } = req.query;

    // 如果没有 articleId，返回空数组（或者返回错误）
    if (!articleId) {
        return res.json([]);
    }

    // 只查询当前文章的评论
    const flatMessages = await Message.find({ articleId }).sort({ createdAt: 1 });

    // 构建评论树
    const map = {};
    flatMessages.forEach(msg => {
        map[msg._id.toString()] = {
            ...msg.toObject(),
            username: msg.username || "匿名用户", // 确保 username 有值
            replies: []
        };
    });

    const tree = [];
    flatMessages.forEach(msg => {
        const id = msg._id.toString();
        if (msg.parentId) {
            const parentId = msg.parentId.toString();
            if (map[parentId]) {
                map[parentId].replies.push(map[id]);
            } else {
                tree.push(map[id]); // 父级丢失，作为顶层评论
            }
        } else {
            tree.push(map[id]);
        }
    });

    res.json(tree);
});

// 添加评论或子评论
app.post('/messages', async (req, res) => {
    const { content, parentId, username, articleId } = req.body;
    const message = new Message({ content, parentId: parentId || null, username: username || "匿名用户", articleId });
    await message.save();
    res.json(message);
});


// 删除留言
app.delete('/messages/:id', async (req, res) => {
    try {
        const result = await Message.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Message not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Invalid ID format' });
    }
});

// 点赞评论
app.post('/messages/:id/like', async (req, res) => {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Not found' });

    message.likes += 1;
    await message.save();
    res.json({ success: true, likes: message.likes });
});

// 👉 新增 API: 获取 /dairy 目录下所有 .md 文件名（不含 .md 后缀）
app.get('/api/list-diaries', (req, res) => {
    const diaryDir = path.join(__dirname, '../../diary'); // 路径指向最外层 dairy 文件夹
    fs.readdir(diaryDir, (err, files) => {
        if (err) return res.status(500).json({ error: '读取失败' });

        const mdFiles = files
            .filter(file => file.endsWith('.md'))
            .map(file => file.replace('.md', ''))
            .sort()
            .reverse(); // 日期从新到旧

        res.json(mdFiles);
    });
});


//添加在线编辑文章的API

// 获取所有文章（管理用）
app.get('/api/articles/all', async (req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// 获取文章列表
// 获取文章列表（支持按分类筛选）
app.get('/api/articles', async (req, res) => {
    const { category } = req.query;
    const query = { published: true };
    if (category) query.category = category;

    const articles = await Article.find(query).sort({ createdAt: -1 });
    res.json(articles);
});

// 获取单篇文章
app.get('/api/articles/:id', async (req, res) => {
    try {
        // 检查是否是有效的ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid article ID' });
        }

        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ error: 'Article not found' });
        res.json(article);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 创建或更新文章
app.post('/api/articles', async (req, res) => {
    const { id, title, content, category } = req.body;

    try {
        if (id) {
            const article = await Article.findByIdAndUpdate(id, {
                title,
                content,
                category,
                updatedAt: Date.now()
            }, { new: true });
            res.json(article);
        } else {
            const article = new Article({
                title,
                content,
                category,
                author: fakeAuthorId // 用一个合法的 ObjectId 测试
            });
            await article.save();
            res.json(article);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新现有文章 - 新增这个路由
app.put('/api/articles/:id', async (req, res) => {
    try {
        const { title, content, category, published } = req.body;

        const article = await Article.findByIdAndUpdate(
            req.params.id,
            {
                title,
                content,
                category,
                published,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!article) {
            return res.status(404).json({ error: '文章不存在' });
        }

        res.json(article);
    } catch (error) {
        console.error('更新文章失败:', error);
        res.status(500).json({ error: '更新文章失败' });
    }
});

// 发布/取消发布文章
app.post('/api/articles/:id/publish', async (req, res) => {
    const { published } = req.body;
    const article = await Article.findByIdAndUpdate(
        req.params.id,
        { published },
        { new: true }
    );
    res.json(article);
});

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});


// 在index.js中添加
async function initTestData() {
    const count = await Article.countDocuments();
    if (count === 0) {
        await Article.create([
            { title: "测试文章1", content: "这是第一篇测试文章", category: "日记", published: true },
            { title: "测试文章2", content: "这是第二篇测试文章", category: "政治", published: false }
        ]);
        console.log("添加了测试文章");
    }
}

// 在数据库连接后调用
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
    initTestData();
});


const path = require("path");

// 挂载 HTML 目录为根目录
app.use(express.static(path.join(__dirname, '../client/HTML')));

// 挂载 CSS、JS 目录
app.use('/CSS', express.static(path.join(__dirname, '../client/CSS')));
app.use('/JS', express.static(path.join(__dirname, '../client/JS')));
// ✅ 允许访问 files 文件夹
app.use('/files', express.static(path.join(__dirname, '../files')));
// 公开日记文件夹作为静态资源
app.use('/diary', express.static(path.join(__dirname, '../../diary')));




// 根路径返回 index.html（也可以省略）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/HTML/index.html'));
});
