// [text, allowed?]  — shared by the filter unit test. 1 = must be allowed, 0 = must be blocked.
module.exports = [
  // ordinary kind messages from young children
  ['Hi Rina! 👋', 1], ['I got 5 stars on level 3!', 1], ['I love sushi tonight', 1], ['home.In the park', 1], ['1 2 3 4 5 6 7 8 9 10', 1],
  ['10, 20, 30, 40, 50, 60, 70', 1], ['100 200 300 400 500', 1], ['I got 3 3 3 3 3 3 3 stars', 1], ['1000000 points!', 1], ['I have $120 coins', 1],
  ['The rooster says cock-a-doodle-doo', 1], ['Kung fu panda!', 1], ['I am at school. See you', 1], ['Assassin creed', 1], ['I passed the class', 1],
  ['Good game!', 1], ['Shiitake mushrooms', 1], ['Let us count: one two three four five six seven', 1], ['I have a hoe for my farm', 1],
  ['Mau main bareng?', 1], ['I am on level 12 with 340 stars', 1], ['See you at 3:30!', 1], ['I fixed a bridge! 🌉', 1], ['Great job! 🌟', 1],
  ['tolong', 1], ['Aku punya anjing', 1], ['Anjing ku lucu', 1], ['Babi hutan di kebun', 1], ['Tai chi is fun', 1], ['I won.Yay!', 1],
  ['10 min 5 is 5', 1], ['My school is fun!', 1], ['I like my pony 🐴', 1], ['What level are you on?', 1], ['I have 1250 coins and 340 stars', 1],
  ['Level 12, 340 stars, 1250 coins', 1], ['Shall we race to level 20?', 1], ['My puppy is so cute', 1], ['Come and visit my island! 🏝️', 1],
  // unkind and rude, including tricks
  ['You are stupid', 0], ['stuuupid', 0], ['s t u p i d', 0], ['f*ck', 0], ['fuuuck', 0], ['ur a l0s3r', 0], ['dasar goblok', 0], ['kamu jelek', 0],
  ['Shut up', 0], ['Shut up!', 0], ['I hate broccoli', 0], ['loser!', 0], ['you are ugly!', 0], ['you are dumb!', 0], ['kill yourself!', 0],
  ['go die!', 0], ['you suck!', 0], ['moron!', 0], ['bodoh!', 0], ['kamu jelek!', 0], ['bego!', 0], ['sialan!', 0], ['loser1', 0],
  ['fu ck', 0], ['stu pid', 0], ['idi ot', 0], ['kon tol', 0], ['bit ch', 0], ['stu​pid', 0], ['stu⁠pid', 0], ['stu­pid', 0],
  ['stu﻿pid', 0], ['stu🌻pid', 0], ['ѕtupіd', 0], ['fuсk', 0], ['іdіоt', 0], ['fvck', 0], ['fcuk', 0], ['phuck', 0], ['dumbass', 0],
  ['stoopid', 0], ['nobody likes u', 0], ['kys!', 0], ['bunuh diri', 0], ['mati lo', 0], ['mati sana', 0], ['anjim', 0], ['anjeng', 0],
  ['ngentod', 0], ['bgst', 0], ['kontl', 0], ['kamujelek', 0], ['anjingg', 0], ['dasar anjing', 0], ['anjing!', 0], ['anjing lu', 0],
  ['kntl', 0], ['k o n t o l', 0], ['n1gga', 0], ['shiiiit', 0], ['F U C K', 0], ['b!tch', 0], ['ngentot', 0], ['b a b i', 0], ['dasar babi', 0],
  // personal details and links
  ['go to www.roblox.com', 0], ['visit rina.com now', 0], ['call me 0812 3456 7890', 0], ['my number is +62 812-345-678', 0],
  ['zero eight one two three four five six', 0], ['email me rina@gmail.com', 0], ['add me @rina_123', 0], ['My score is 1234567', 0],
  ['wa.me/628123', 0], ['rina (at) gmail', 0], ['0812a3456a789', 0], ['0812x3456x7890', 0], ['0812|3456|7890', 0], ['0812🌻3456🌻7890', 0],
  ['0812⁠3456⁠7890', 0], ['０８１２３４５６７８９', 0], ['٠٨١٢٣٤٥٦٧٨٩', 0], ['⓪⑧①②③④⑤⑥⑦', 0], ['⁰⁸¹²³⁴⁵⁶⁷', 0],
  ['0️⃣8️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣', 0], ['kosong lapan satu dua tiga empat lima', 0], ['zero! eight! one! two! three! four! five!', 0],
  ['rina @ gmail . com', 0], ['play rina.games', 0], ['rina.me', 0], ['rina.tk', 0], ['youtu.be/x', 0], ['roblox．com', 0], ['roblox。com', 0],
  ['roblox . com', 0], ['roblox[.]com', 0], ['rоblox.cоm', 0], ['roblox​.com', 0], ['＠rina_cute', 0], ['add me:@rina', 0], ['@ rina', 1],
  ['I live at 12 Oak Street', 0], ['Jalan Melati No 5', 0], ['SD Negeri 3 Menteng', 0], ['rumahku di dekat taman', 0], ['RT 3 RW 5', 0],
  ['aku tinggal di Menteng', 0], ['sekolahku di Kemang', 0], ['my address is secret', 0],
  // second review: ordinary game chat that must stay allowed
  ['I stay at home today', 1], ['I live in a big island in the game', 1], ['I live on level 12', 1], ['gg Rina you got 3 stars', 1], ['gg wp 2 more levels', 1],
  ['Ayo jalan ke farm 3', 1], ['aku jalan jalan ke level 5', 1], ['Yuk jalan bareng ke pulau 2', 1], ['Level 5 is so close!', 1], ['only 3 farms are close', 1],
  ['6 + 6 = 12, 7 + 7 = 14', 1], ['4 + 4 = 8, 8 + 8 = 16', 1], ['1+1=2 2+2=4 3+3=6', 1], ['10 - 3 = 7, 7 + 2 = 9', 1], ['3 x 3 = 9, 4 x 4 = 16', 1],
  ['My scores: 12, 15, 18, 20', 1], ['1000 2000 3000', 1], ['Kamu punya anjing?', 1], ['Anjing kamu lucu', 1], ['Kamu suka monyet?', 1], ['u have anjing?', 1],
  ['see you later @ school', 1], ['Hi @ everyone', 1], ['I am @ level 5', 1], ['ok.bye', 1], ['haha.lol', 1], ['wow.cool', 1], ['I won.yay', 1],
  ['done.now level 6', 1], ['hi.my', 1], ['Fine.so', 1], ['Matematika dasar itu seru', 1], ['I play roblox too', 1],
  // second review: tricks that must be blocked
  ['Rina babi', 0], ['Budi monyet!', 0], ['Rina itu anjing', 0], ['kamu itu seperti babi', 0], ['muka babi', 0], ['kayak babi', 0], ['otak monyet', 0],
  ['anjing banget', 0], ['anj ing', 0], ['0812 lalu 3456 lalu 789', 0], ['0812 and then 3456 and 789', 0], ['nomor aku nol delapan satu dua, terus tiga empat lima enam', 0],
  ['rina.Store', 0], ['rina.Shop', 0], ['rina.Club', 0], ['rina.Fun', 0], ['T.Me/rinacute', 0], ['Linktr.Ee/rina', 0], ['roblox·com', 0], ['roblox•com', 0],
  ['roblox,com', 0], ['roblox/com', 0], ['rinacute dot store', 0], ['roblox dot c o m', 0], ['my ig is rinacute', 0], ['roblox: rinacute', 0],
  ['add me on roblox rinacute', 0], ['username aku rinacute', 0], ['wa aku ya', 0], ['I go to Al Azhar', 0], ['my school is JIS', 0], ['sekolahku Al Azhar', 0],
  ['SD Tarakanita', 0], ['rumahku dekat masjid', 0], ['jalan melati no 5', 0], ['Jl. Melati 5', 0], ['jerk!', 0], ['dork', 0], ['you are fat', 0],
  ['you smell bad', 0], ['you are trash', 0], ['i h8 u', 0], ['u sux', 0], ['yousuck', 0], ['kamu bau', 0], ['kamu jahat', 0], ['dasar gila', 0],
  ['dasar autis', 0], ['cacat', 0], ['norak', 0], ['najis', 0], ['bloon', 0], ['kamu oon', 0], ['dongo', 0], ['diem lu', 0], ['pergi sana', 0],
  ['gak ada yang suka kamu', 0], ['matilah', 0], ['@home', 1], ['add me @budi_cool', 0],
  // third review: asking for details or meeting up
  ['can I have your number', 0], ['what is your phone number', 0], ['whats ur wa', 0], ['where do you live', 0], ['where is your house', 0],
  ['what school do you go to', 0], ['send me a photo', 0], ['whats your real name', 0], ['meet me at the park', 0], ['rumah kamu di mana', 0],
  ['kamu tinggal di mana', 0], ['sekolah kamu di mana', 0], ['nomor hp kamu berapa', 0], ['minta nomor wa kamu', 0], ['kirim foto kamu', 0],
  ['nama asli kamu siapa', 0], ['ketemuan yuk di taman', 0],
  // third review: numbers in small pieces, words and digits mixed
  ['81 23 45 67 89', 0], ['+62 81 23 45 67 89', 0], ['wa 81 23 45 67 89', 0], ['8 1 2 3 4 5 6 7 8', 0], ['nol delapan lalu satu dua tiga lalu empat lima', 0],
  ['zero eight one two 3 4 5 6', 0], ['08 one two 34 five six 7', 0],
  // third review: animal words turned into insults
  ['kamu anak anjing', 0], ['Rina anak babi', 0], ['dasar anak monyet', 0], ['anjing kamu semua', 0], ['babi lu semua', 0], ['monyet kamu ya', 0], ['babi kau ini', 0],
  ['you are my babi', 0], ['Rina is my monyet', 0], ['@ rinacute', 0], ['follow @ rinacute', 0], ['ig @ rinacute', 0], ['rina @ gmail', 0],
  ['you are a pig', 0], ['pig face', 0], ['you look like a monkey', 0], ['you are a donkey', 0], ['nobody wants to play with you', 0], ['go away', 0],
  ['i dont like you', 0], ['you are not my friend', 0], ['shut your mouth', 0], ['poopy head', 0], ['butthead', 0], ['kamu payah', 0], ['kamu aneh', 0],
  ['kamu lambat', 0], ['aku ga mau temenan sama kamu', 0], ['kamu bukan temanku', 0], ['rina nyebelin', 0], ['tiktok rina.cute', 0], ['search rinacute on youtube', 0],
  ['jl melati 5', 0], ['Jalan Melati nomor lima', 0],
  // third review: must stay allowed
  ['call me Budi', 1], ['aku sekolah di rumah', 1], ['dasar matematika susah', 1], ['dasar laut biru', 1], ['Your babi is cute', 1], ['my dog is cute', 1],
  ['dog!', 1], ['I bought a pig and a cow', 1], ['you have a pig?', 1], ['I fed the cow', 1], ['anak anjing itu lucu', 1], ['aku punya anak anjing', 1],
  ['@ Rina great job', 1], ['Is that your dog?', 1], ['We have 3 goats', 1], ['I found a chest! 💰', 1], ['aku ketemu peti harta', 1]
];
