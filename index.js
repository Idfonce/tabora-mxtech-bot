const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const pino = require('pino')
const fs = require('fs')

// Create auth folder if not exists
if (!fs.existsSync('./auth')) fs.mkdirSync('./auth')

// Database for user settings
let db = {}
const DB_FILE = './database.json'

// Load database
if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
}

// Save database function
function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

console.log('\n🇹🇿 ======================================== 🇹🇿')
console.log('    WELCOME TO TABORA-MXTECH BOT')
console.log('    Created in Tanzania | East Africa')
console.log('    Version 2.0 | 4 Features Activated')
console.log('🇹🇿 ======================================== 🇹🇿\n')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['Tabora-MXtech', 'Chrome', '2.0.0'],
        markOnlineOnConnect: true,
        syncFullHistory: false
    })

    // Handle connection
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            console.log('\n📱 SCAN THIS QR CODE WITH WHATSAPP:')
            qrcode.generate(qr, { small: true })
            console.log('\n⏳ Waiting for scan...')
        }

        if (connection === 'open') {
            console.log('\n✅ ==================================== ✅')
            console.log('   🎉 TABORA-MXTECH BOT CONNECTED! 🎉')
            console.log('✅ ==================================== ✅\n')
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ Bot logged out! Please reconnect.')
                process.exit(1)
            } else {
                console.log('❌ Connection lost. Reconnecting in 5 seconds...')
                setTimeout(() => startBot(), 5000)
            }
        }
    })

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        
        const from = msg.key.remoteJid
        const sender = msg.key.participant || from
        const senderNumber = sender.split('@')[0]
        
        // Get message text
        let text = ''
        if (msg.message.conversation) text = msg.message.conversation
        else if (msg.message.extendedTextMessage) text = msg.message.extendedTextMessage.text
        else return
        
        // Check if it's a command (starts with .)
        if (!text.startsWith('.')) return
        
        const command = text.slice(1).split(' ')[0].toLowerCase()
        const args = text.slice(1).split(' ').slice(1)
        const arg = args[0]?.toLowerCase()
        
        // Initialize user settings if not exists
        if (!db[senderNumber]) {
            db[senderNumber] = {
                autostatusreact: false,
                autoviewstatus: false,
                alwaysonline: false,
                antidelete: false,
                joined: new Date().toISOString()
            }
            saveDB()
        }
        
        const user = db[senderNumber]
        
        // ============ COMMAND HANDLER ============
        
        // 1. AUTO STATUS REACT
        if (command === 'autostatusreact') {
            if (arg === 'on') {
                user.autostatusreact = true
                saveDB()
                await sock.sendMessage(from, {
                    text: `✅ *SuccessFully Activated Auto Status React.*\n\n❤️ Auto react enabled\n\n🇹🇿 *Tabora-MXtech Bot*`
                })
            } else if (arg === 'off') {
                user.autostatusreact = false
                saveDB()
                await sock.sendMessage(from, {
                    text: `❌ *Auto Status React Deactivated.*\n\n🇹🇿 *Tabora-MXtech Bot*`
                })
            } else {
                await sock.sendMessage(from, {
                    text: `⚡ *Usage:* .autostatusreact on/off\n\nCurrent: ${user.autostatusreact ? '✅ ON' : '❌ OFF'}`
                })
            }
        }
        
        // 2. AUTO VIEW STATUS
        else if (command === 'autoviewstatus') {
            if (arg === 'on') {
                user.autoviewstatus = true
                saveDB()
                await sock.sendMessage(from, {
                    text: `✅ *Successfully Activated Auto-View Status.*\n\n👀 Auto view enabled\n\n🇹🇿 *Tabora-MXtech Bot*`
                })
            } else if (arg === 'off') {
                user.autoviewstatus = false
                saveDB()
                await sock.sendMessage(from, {
                    text: `❌ *Auto-View Status Deactivated.*\n\n🇹🇿 *Tabora-MXtech Bot*`
                })
            } else {
                await sock.sendMessage(from, {
                    text: `⚡ *Usage:* .autoviewstatus on/off\n\nCurrent: ${user.autoviewstatus ? '✅ ON' : '❌ OFF'}`
                })
            }
        }
        
        // 3. ALWAYS ONLINE
        else if (command === 'alwaysonline') {
            if (arg === 'on') {
                user.alwaysonline = true
                saveDB()
                await sock.sendMessage(from, {
                    text: `✅ *SuccessFully Activated Alwaysonline.*\n\n🟢 Always online enabled\n\n🇹🇿 *Tabora-MXtech Bot*`
                })
            } else if (arg === 'off') {
                user.alwaysonline = false
                saveDB()
                await sock.sendMessage(from, {
                    text: `❌ *Alwaysonline Deactivated.*\n\n🇹🇿 *Tabora-MXtech Bot*`
                })
            } else {
                await sock.sendMessage(from, {
                    text: `⚡ *Usage:* .alwaysonline on/off\n\nCurrent: ${user.alwaysonline ? '✅ ON' : '❌ OFF'}`
                })
            }
        }
        
        // 4. ANTI DELETE
        else if (command === 'antidelete') {
            if (arg === 'on') {
                user.antidelete = true
                saveDB()
                await sock.sendMessage(from, {
                    text: `✅ *Anti-Delete Activated!*\n\n🗑️ Anti delete enabled\n\n🇹🇿 *Tabora-MXtech Bot*`
                })
            } else if (arg === 'off') {
                user.antidelete = false
                saveDB()
                await sock.sendMessage(from, {
                    text: `❌ *Anti-Delete Deactivated.*\n\n🇹🇿 *Tabora-MXtech Bot*`
                })
            } else {
                await sock.sendMessage(from, {
                    text: `⚡ *Usage:* .antidelete on/off\n\nCurrent: ${user.antidelete ? '✅ ON' : '❌ OFF'}`
                })
            }
        }
        
        // HELP COMMAND
        else if (command === 'help') {
            const helpText = `╔════════════════════╗
║   🇹🇿 *TABORA-MXTECH*   ║
╚════════════════════╝

*Available Commands:*

1️⃣ *.autostatusreact on/off*
   ❤️ Auto react to status

2️⃣ *.autoviewstatus on/off*
   👀 Auto view status

3️⃣ *.alwaysonline on/off*
   🟢 Keep bot online 24/7

4️⃣ *.antidelete on/off*
   🗑️ See deleted messages

5️⃣ *.help*
   📋 Show this menu

━━━━━━━━━━━━━━━━
📍 *Region:* Tabora, Tanzania
⚡ *Version:* 2.0
━━━━━━━━━━━━━━━━`

            await sock.sendMessage(from, { text: helpText })
        }
    })

    // Handle status updates
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        
        // Check if it's a status update
        if (msg.key && msg.key.remoteJid === 'status@broadcast') {
            const sender = msg.key.participant?.split('@')[0]
            
            // Check user settings
            if (db[sender]) {
                // Auto View Status
                if (db[sender].autoviewstatus) {
                    await sock.readMessages([msg.key])
                }
                
                // Auto Status React
                if (db[sender].autostatusreact) {
                    setTimeout(async () => {
                        await sock.sendMessage('status@broadcast', {
                            react: {
                                text: '❤️',
                                key: msg.key
                            }
                        })
                    }, 2000)
                }
            }
        }
    })

    // Always Online
    setInterval(() => {
        sock.sendPresenceUpdate('available')
    }, 20000)

    // Save credentials
    sock.ev.on('creds.update', saveCreds)
}

// Error handling
process.on('uncaughtException', console.error)
process.on('unhandledRejection', console.error)

// Start bot
startBot()
