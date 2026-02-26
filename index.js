const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')

// Create auth folder
if (!fs.existsSync('./auth')) fs.mkdirSync('./auth')

console.log('\n🇹🇿 ======================================== 🇹🇿')
console.log('    TABORA-MXTECH BOT')
console.log('    Created in Tanzania | East Africa')
console.log('    Version 2.0 | 4 Features Activated')
console.log('🇹🇿 ======================================== 🇹🇿\n')

// YOUR PHONE NUMBER FROM ENV
const MY_NUMBER = process.env.MY_NUMBER || ''  // Add this in Katabump ENV

if (!MY_NUMBER) {
    console.log('❌ Please add MY_NUMBER to environment variables!')
    console.log('Example: MY_NUMBER=255623553450')
    process.exit(1)
}

console.log(`📱 Your number: ${MY_NUMBER}`)

// Database
let db = {}
const DB_FILE = './database.json'
if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./auth')
        
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['Tabora-MXtech', 'Chrome', '2.0.0'],
            markOnlineOnConnect: true,
            syncFullHistory: false
        })

        // If not registered, automatically get pairing code for YOUR number
        if (!state.creds?.registered) {
            console.log('\n⏳ Getting pairing code for your number...')
            
            try {
                const cleanNumber = MY_NUMBER.replace(/\D/g, '')
                const code = await sock.requestPairingCode(cleanNumber)
                
                console.log('\n✅ ============================ ✅')
                console.log('   🔑 YOUR PAIRING CODE IS:')
                console.log(`   📱 ${code}`)
                console.log('✅ ============================ ✅\n')
                
                console.log('📌 INSTRUCTIONS:')
                console.log('1. Open WhatsApp on your phone')
                console.log('2. Go to Settings → Linked Devices')
                console.log('3. Tap "Link a Device"')
                console.log('4. Enter this code: ' + code)
                console.log('5. Wait for connection...\n')
                
                // Save code to file
                fs.writeFileSync('./my_code.txt', `Code: ${code}\nDate: ${new Date().toLocaleString()}`)
                
            } catch (err) {
                console.log('❌ Error getting code:', err.message)
            }
        }

        // Handle connection
        sock.ev.on('connection.update', (update) => {
            const { connection } = update
            
            if (connection === 'open') {
                console.log('\n✅ BOT CONNECTED SUCCESSFULLY! 🇹🇿\n')
                
                // Keep alive
                setInterval(() => {
                    try {
                        if (sock.user?.id) {
                            sock.sendPresenceUpdate('available')
                        }
                    } catch (err) {}
                }, 20000)
            }
            
            if (connection === 'close') {
                console.log('❌ Connection lost. Reconnecting...')
                setTimeout(() => startBot(), 5000)
            }
        })

        // Handle commands (YOUR 4 FEATURES)
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0]
            if (!msg.message) return
            
            const from = msg.key.remoteJid
            const sender = msg.key.participant || from
            const senderNumber = sender.split('@')[0]
            
            let text = ''
            if (msg.message.conversation) text = msg.message.conversation
            else if (msg.message.extendedTextMessage) text = msg.message.extendedTextMessage.text
            else return
            
            if (!text.startsWith('.')) return
            
            const command = text.slice(1).split(' ')[0].toLowerCase()
            const arg = text.slice(1).split(' ')[1]?.toLowerCase()
            
            // User settings
            if (!db[senderNumber]) {
                db[senderNumber] = {
                    autostatusreact: false,
                    autoviewstatus: false,
                    alwaysonline: false,
                    antidelete: false
                }
                saveDB()
            }
            
            const user = db[senderNumber]
            
            // 1. AUTO STATUS REACT
            if (command === 'autostatusreact') {
                if (arg === 'on') {
                    user.autostatusreact = true
                    saveDB()
                    await sock.sendMessage(from, { text: '✅ *Auto Status React Activated!* ❤️\n\n🇹🇿 Tabora-MXtech Bot' })
                } else if (arg === 'off') {
                    user.autostatusreact = false
                    saveDB()
                    await sock.sendMessage(from, { text: '❌ *Auto Status React Deactivated!*\n\n🇹🇿 Tabora-MXtech Bot' })
                } else {
                    await sock.sendMessage(from, { text: `Current: ${user.autostatusreact ? '✅ ON' : '❌ OFF'}\nUse: .autostatusreact on/off` })
                }
            }
            
            // 2. AUTO VIEW STATUS
            else if (command === 'autoviewstatus') {
                if (arg === 'on') {
                    user.autoviewstatus = true
                    saveDB()
                    await sock.sendMessage(from, { text: '✅ *Auto View Status Activated!* 👀\n\n🇹🇿 Tabora-MXtech Bot' })
                } else if (arg === 'off') {
                    user.autoviewstatus = false
                    saveDB()
                    await sock.sendMessage(from, { text: '❌ *Auto View Status Deactivated!*\n\n🇹🇿 Tabora-MXtech Bot' })
                } else {
                    await sock.sendMessage(from, { text: `Current: ${user.autoviewstatus ? '✅ ON' : '❌ OFF'}\nUse: .autoviewstatus on/off` })
                }
            }
            
            // 3. ALWAYS ONLINE
            else if (command === 'alwaysonline') {
                if (arg === 'on') {
                    user.alwaysonline = true
                    saveDB()
                    await sock.sendMessage(from, { text: '✅ *Always Online Activated!* 🟢\n\n🇹🇿 Tabora-MXtech Bot' })
                } else if (arg === 'off') {
                    user.alwaysonline = false
                    saveDB()
                    await sock.sendMessage(from, { text: '❌ *Always Online Deactivated!*\n\n🇹🇿 Tabora-MXtech Bot' })
                } else {
                    await sock.sendMessage(from, { text: `Current: ${user.alwaysonline ? '✅ ON' : '❌ OFF'}\nUse: .alwaysonline on/off` })
                }
            }
            
            // 4. ANTI DELETE
            else if (command === 'antidelete') {
                if (arg === 'on') {
                    user.antidelete = true
                    saveDB()
                    await sock.sendMessage(from, { text: '✅ *Anti Delete Activated!* 🗑️\n\n🇹🇿 Tabora-MXtech Bot' })
                } else if (arg === 'off') {
                    user.antidelete = false
                    saveDB()
                    await sock.sendMessage(from, { text: '❌ *Anti Delete Deactivated!*\n\n🇹🇿 Tabora-MXtech Bot' })
                } else {
                    await sock.sendMessage(from, { text: `Current: ${user.antidelete ? '✅ ON' : '❌ OFF'}\nUse: .antidelete on/off` })
                }
            }
            
            // HELP
            else if (command === 'help') {
                const help = `╔════════════════════╗
║  🇹🇿 TABORA-MXTECH  ║
╚════════════════════╝

*Commands:*
❤️ .autostatusreact on/off
👀 .autoviewstatus on/off
🟢 .alwaysonline on/off
🗑️ .antidelete on/off
📋 .help

📍 Tabora, Tanzania`
                await sock.sendMessage(from, { text: help })
            }
        })

        // Handle status updates
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0]
            if (msg.key?.remoteJid === 'status@broadcast') {
                const sender = msg.key.participant?.split('@')[0]
                
                if (db[sender]?.autoviewstatus) {
                    await sock.readMessages([msg.key])
                }
                
                if (db[sender]?.autostatusreact) {
                    setTimeout(async () => {
                        await sock.sendMessage('status@broadcast', {
                            react: { text: '❤️', key: msg.key }
                        })
                    }, 2000)
                }
            }
        })

        sock.ev.on('creds.update', saveCreds)

    } catch (err) {
        console.log('❌ Error:', err.message)
        setTimeout(startBot, 5000)
    }
}

startBot()
