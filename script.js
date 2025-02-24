// 从 Firebase SDK 导入所需函数
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, remove, onValue, query, orderByChild, equalTo, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// 你的 Firebase 配置信息
const firebaseConfig = {
    apiKey: "AIzaSyDVMaVH_yM90sk0X7dNqiLbGvmVPYt5oJE",
    authDomain: "kayexv-ab513.firebaseapp.com",
    projectId: "kayexv-ab513",
    storageBucket: "kayexv-ab513.firebasestorage.app",
    messagingSenderId: "411166293599",
    appId: "1:411166293599:web:698ab3ab3bda25935465ea",
    measurementId: "G-JVT12SXSL8"
};

// 初始化 Firebase 应用
const app = initializeApp(firebaseConfig);
// 获取数据库实例
const database = getDatabase(app);
// 获取书签数据的引用
const bookmarksRef = ref(database, 'bookmarks');

// 获取页面中的 DOM 元素
const bookmarkNameInput = document.getElementById('bookmarkName');
const bookmarkUrlInput = document.getElementById('bookmarkUrl');
const addBookmarkButton = document.getElementById('addBookmark');
const bookmarkList = document.getElementById('bookmarkList');
const importBookmarksInput = document.getElementById('importBookmarks');
const processImportButton = document.getElementById('processImport');

// 显示书签列表的函数
function displayBookmarks() {
    // 清空书签列表
    bookmarkList.innerHTML = '';
    const groups = {};

    // 监听数据库中书签数据的变化
    onValue(bookmarksRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const bookmark = childSnapshot.val();
            const key = childSnapshot.key;
            const group = bookmark.group || '未分组';

            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push({ ...bookmark, key });
        });

        for (const group in groups) {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('bookmark-group');

            const groupTitle = document.createElement('h2');
            groupTitle.textContent = group;
            groupDiv.appendChild(groupTitle);

            const groupList = document.createElement('ul');
            groups[group].forEach((bookmark) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = bookmark.url;
                a.textContent = bookmark.name;
                a.target = '_blank';

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '删除';
                deleteButton.addEventListener('click', () => {
                    removeBookmark(bookmark.key);
                });

                li.appendChild(a);
                li.appendChild(deleteButton);
                groupList.appendChild(li);
            });
            groupDiv.appendChild(groupList);
            bookmarkList.appendChild(groupDiv);
        }
    });
}

// 添加书签的函数
function addBookmark() {
    const name = bookmarkNameInput.value;
    const url = bookmarkUrlInput.value;

    if (name && url) {
        // 手动添加的书签标记为 manual 且默认未分组
        push(bookmarksRef, { name, url, source: 'manual', group: '未分组' })
           .then(() => {
                // 重新显示书签列表
                displayBookmarks();
                // 清空输入框
                bookmarkNameInput.value = '';
                bookmarkUrlInput.value = '';
            })
           .catch((error) => {
                console.error('添加书签失败:', error);
            });
    }
}

// 删除书签的函数
function removeBookmark(key) {
    // 获取要删除的书签数据的引用
    const bookmarkToRemoveRef = ref(database, `bookmarks/${key}`);
    // 从数据库中删除该书签数据
    remove(bookmarkToRemoveRef)
       .then(() => {
            // 重新显示书签列表
            displayBookmarks();
        })
       .catch((error) => {
            console.error('删除书签失败:', error);
        });
}

// 处理导入书签的函数
async function processImport() {
    const file = importBookmarksInput.files[0];
    if (file) {
        // 先删除之前导入的书签
        const importedBookmarksQuery = query(bookmarksRef, orderByChild('source'), equalTo('imported'));
        const importedBookmarksSnapshot = await get(importedBookmarksQuery);
        importedBookmarksSnapshot.forEach((childSnapshot) => {
            const key = childSnapshot.key;
            remove(ref(database, `bookmarks/${key}`));
        });

        const reader = new FileReader();
        reader.onload = function (e) {
            const htmlContent = e.target.result;
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const folders = doc.querySelectorAll('h3');

            folders.forEach((folder) => {
                const group = folder.textContent;
                const links = folder.nextElementSibling.querySelectorAll('a');
                links.forEach((link) => {
                    const name = link.textContent;
                    const url = link.href;
                    // 导入的书签标记为 imported 并记录分组
                    push(bookmarksRef, { name, url, source: 'imported', group })
                       .catch((error) => {
                            console.error('导入书签失败:', error);
                        });
                });
            });
            // 处理未分组的书签
            const ungroupedLinks = doc.querySelectorAll('body > a');
            ungroupedLinks.forEach((link) => {
                const name = link.textContent;
                const url = link.href;
                push(bookmarksRef, { name, url, source: 'imported', group: '未分组' })
                   .catch((error) => {
                        console.error('导入书签失败:', error);
                    });
            });
            // 重新显示书签列表
            displayBookmarks();
        };
        reader.readAsText(file);
    }
}

// 为添加书签按钮绑定点击事件
addBookmarkButton.addEventListener('click', addBookmark);
// 为导入书签按钮绑定点击事件
processImportButton.addEventListener('click', processImport);

// 页面加载时显示书签列表
displayBookmarks();
