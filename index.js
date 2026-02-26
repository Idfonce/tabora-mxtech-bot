const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const qrcode = require('qrcode-terminal')

// Read from .env file
require('dotenv').config()

// Get settings from .env
const OWNER_NUMBER = process.env.OWNER_NUMBER || '255623553450'
const PREFIX = process.env.PREFIX || '.'
const BOT_NAME = process.env.BOT_NAME || 'TABORA-MXTECH'
const AUTHOR = process.env.AUTHOR || 'Tabora-MXtech'
const REGION = process.env.REGION || 'Tabora, Tanzania'

// Default feature settings from .env
const DEFAULT_AUTO_STATUS_REACT = process.env.AUTO_STATUS_REACT === 'true'
const DEFAULT_AUTO_VIEW_STATUS = process.env.AUTO_VIEW_STATUS === 'true'
const DEFAULT_ALWAYS_ONLINE = process.env.ALWAYS_ONLINE === 'true'
const DEFAULT_ANTI_DELETE = process.env.ANTI_DELETE === 'true'

console.log('\n🇹🇿 ======================================== 🇹🇿')
console.log(`    ${BOT_NAME}`)
console.log(`    Created in ${REGION}`)
console.log('    Version 2.0 | 4 Features Activated')
console.log('🇹🇿 ======================================== 🇹🇿\n')
console.log(`📱 Owner: ${OWNER_NUMBER}`)
console.log(`🔧 Prefix: ${PREFIX}`)
console.log(`❤️ Auto Status React: ${DEFAULT_AUTO_STATUS_REACT ? 'ON' : 'OFF'}`)
console.log(`👀 Auto View Status: ${DEFAULT_AUTO_VIEW_STATUS ? 'ON' : 'OFF'}`)
console.log(`🟢 Always Online: ${DEFAULT_ALWAYS_ONLINE ? 'ON' : 'OFF'}`)
console.log(`🗑️ Anti Delete: ${DEFAULT_ANTI_DELETE ? 'ON' : 'OFF'}\n`)

// Create auth folder
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

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./auth')
        
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: [BOT_NAME, 'Chrome', '2.0.0'],
            markOnlineOnConnect: DEFAULT_ALWAYS_ONLINE,
            syncFullHistory: false
        })

        // If not registered, get pairing code for owner
        if (!state.creds?.registered) {
            console.log('\n⏳ Getting pairing code for owner...')
            
            try {
                const cleanNumber = OWNER_NUMBER.replace(/\D/g, '')
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
                fs.writeFileSync('./pairing_code.txt', `Code: ${code}\nDate: ${new Date().toLocaleString()}`)
                
            } catch (err) {
                console.log('❌ Error getting pairing code:', err.message)
            }
        }

        // Handle connection
        sock.ev.on('connection.update', (update) => {
            const { connection, qr } = update
            
            if (qr && !state.creds?.registered) {
                console.log('\n📱 QR CODE (backup method):')
                qrcode.generate(qr, { small: true })
            }
            
            if (connection === 'open') {
                console.log('\n✅ ==================================== ✅')
                console.log('   🎉 BOT CONNECTED SUCCESSFULLY! 🎉')
                console.log('✅ ==================================== ✅\n')
                console.log(`🤖 ${BOT_NAME} is now online!`)
                console.log(`📍 ${REGION}\n`)
                
                // Keep alive interval for Always Online feature
                setInterval(() => {
                    try {
                        if (sock.user?.id) {
                            sock.sendPresenceUpdate('available')
                        }
                    } catch (err) {}
                }, 20000)
            }
            
            if (connection === 'close') {
                console.log('❌ Connection lost. Reconnecting in 5 seconds...')
                setTimeout(() => startBot(), 5000)
            }
        })

        // Handle incoming messages (commands)
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0]
            if (!msg.message) return
            
            const from = msg.key.remoteJid
            const sender = msg.key.participant || from
            const senderNumber = sender.split('@')[0]
            const isGroup = from.endsWith('@g.us')
            
            // Get message text
            let text = ''
            if (msg.message.conversation) text = msg.message.conversation
            else if (msg.message.extendedTextMessage) text = msg.message.extendedTextMessage.text
            else return
            
            // Check if it's a command
            if (!text.startsWith(PREFIX)) return
            
            const command = text.slice(1).split(' ')[0].toLowerCase()
            const args = text.slice(1).split(' ').slice(1)
            const arg = args[0]?.toLowerCase()
            
            // Initialize user settings if not exists
            if (!db[senderNumber]) {
                db[senderNumber] = {
                    autostatusreact: DEFAULT_AUTO_STATUS_REACT,
                    autoviewstatus: DEFAULT_AUTO_VIEW_STATUS,
                    alwaysonline: DEFAULT_ALWAYS_ONLINE,
                    antidelete: DEFAULT_ANTI_DELETE,
                    joined: new Date().toISOString()
                }
                saveDB()
            }
            
            const user = db[senderNumber]
            
            // ============ COMMAND HANDLER ============
            
            // 1. AUTO STATUS REACT COMMAND
            if (command === 'autostatusreact') {
                if (arg === 'on') {
                    user.autostatusreact = true
                    saveDB()
                    await sock.sendMessage(from, { 
                        text: `✅ *Auto Status React Activated!*\n\n❤️ Bot will now react to status updates with ❤️\n\n🇹🇿 *${BOT_NAME}*` 
                    })
                } else if (arg === 'off') {
                    user.autostatusreact = false
                    saveDB()
                    await sock.sendMessage(from, { 
                        text: `❌ *Auto Status React Deactivated!*\n\n❤️ Bot will no longer react to status\n\n🇹🇿 *${BOT_NAME}*` 
                    })
                } else {
                    await sock.sendMessage(from, { 
                        text: `⚡ *Usage:* ${PREFIX}autostatusreact on/off\n\nCurrent status: ${user.autostatusreact ? '✅ ON' : '❌ OFF'}` 
                    })
                }
            }
            
            // 2. AUTO VIEW STATUS COMMAND
            else if (command === 'autoviewstatus') {
                if (arg === 'on') {
                    user.autoviewstatus = true
                    saveDB()
                    await sock.sendMessage(from, { 
                        text: `✅ *Auto View Status Activated!*\n\n👀 Bot will now view all status updates automatically\n\n🇹🇿 *${BOT_NAME}*` 
                    })
                } else if (arg === 'off') {
                    user.autoviewstatus = false
                    saveDB()
                    await sock.sendMessage(from, { 
                        text: `❌ *Auto View Status Deactivated!*\n\n👀 Bot will no longer auto-view status\n\n🇹🇿 *${BOT_NAME}*` 
                    })
                } else {
                    await sock.sendMessage(from, { 
                        text: `⚡ *Usage:* ${PREFIX}autoviewstatus on/off\n\nCurrent status: ${user.autoviewstatus ? '✅ ON' : '❌ OFF'}` 
                    })
                }
            }
            
            // 3. ALWAYS ONLINE COMMAND
            else if (command === 'alwaysonline') {
                if (arg === 'on') {
                    user.alwaysonline = true
                    saveDB()
                    await sock.sendMessage(from, { 
                        text: `✅ *Always Online Activated!*\n\n🟢 Bot will now stay online 24/7\n\n🇹🇿 *${BOT_NAME}*` 
                    })
                } else if (arg === 'off') {
                    user.alwaysonline = false
                    saveDB()
                    await sock.sendMessage(from, { 
                        text: `❌ *Always Online Deactivated!*\n\n🟢 Bot will no longer force online status\n\n🇹🇿 *${BOT_NAME}*` 
                    })
                } else {
                    await sock.sendMessage(from, { 
                        text: `⚡ *Usage:* ${PREFIX}alwaysonline on/off\n\nCurrent status: ${user.alwaysonline ? '✅ ON' : '❌ OFF'}` 
                    })
                }
            }
            
            // 4. ANTI DELETE COMMAND
            else if (command === 'antidelete') {
                if (arg === 'on') {
                    user.antidelete = true
                    saveDB()
                    await sock.sendMessage(from, { 
                        text: `✅ *Anti Delete Activated!*\n\n🗑️ Bot will now detect and show deleted messages\n\n🇹🇿 *${BOT_NAME}*` 
                    })
                } else if (arg === 'off') {
                    user.antidelete = false
                    saveDB()
                    await sock.sendMessage(from, { 
                        text: `❌ *Anti Delete Deactivated!*\n\n🗑️ Bot will no longer detect deleted messages\n\n🇹🇿 *${BOT_NAME}*` 
                    })
                } else {
                    await sock.sendMessage(from, { 
                        text: `⚡ *Usage:* ${PREFIX}antidelete on/off\n\nCurrent status: ${user.antidelete ? '✅ ON' : '❌ OFF'}` 
                    })
                }
            }
            
            // HELP COMMAND
            else if (command === 'help') {
                const helpText = `╔════════════════════╗
║  🇹🇿 *${BOT_NAME}*  ║
╚════════════════════╝

*Available Commands:*

1️⃣ *${PREFIX}autostatusreact on/off*
   ❤️ Auto react to status

2️⃣ *${PREFIX}autoviewstatus on/off*
   👀 Auto view status

3️⃣ *${PREFIX}alwaysonline on/off*
   🟢 Keep bot online 24/7

4️⃣ *${PREFIX}antidelete on/off*
   🗑️ See deleted messages

5️⃣ *${PREFIX}help*
   📋 Show this menu

━━━━━━━━━━━━━━━━
📍 *Region:* ${REGION}
👑 *Creator:* ${AUTHOR}
⚡ *Version:* 2.0
━━━━━━━━━━━━━━━━`

                await sock.sendMessage(from, { text: helpText })
            }
            
            // STATUS COMMAND
            else if (command === 'status') {
                const statusText = `📊 *Your Bot Settings*

━━━━━━━━━━━━━━━━
❤️ Auto React: ${user.autostatusreact ? '✅ ON' : '❌ OFF'}
👀 Auto View: ${user.autoviewstatus ? '✅ ON' : '❌ OFF'}
🟢 Always Online: ${user.alwaysonline ? '✅ ON' : '❌ OFF'}
🗑️ Anti Delete: ${user.antidelete ? '✅ ON' : '❌ OFF'}
━━━━━━━━━━━━━━━━

🇹🇿 *${BOT_NAME}*
📍 ${REGION}`

                await sock.sendMessage(from, { text: statusText })
            }
        })

        // Handle status updates (for auto features)
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
                        try {
                            await sock.readMessages([msg.key])
                            console.log(`👀 Auto-viewed status from ${sender}`)
                        } catch (err) {}
                    }
                    
                    // Auto Status React
                    if (db[sender].autostatusreact) {
                        setTimeout(async () => {
                            try {
                                await sock.sendMessage('status@broadcast', {
                                    react: {
                                        text: '❤️',
                                        key: msg.key
                                    }
                                })
                                console.log(`❤️ Auto-reacted to status from ${sender}`)
                            } catch (err) {}
                        }, 2000)
                    }
                }
            }
        })

        // Anti-Delete feature
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                // Check if message was deleted (stub type 17)
                if (update.update.messageStubType === 17) {
                    const from = update.key.remoteJid
                    const sender = update.key.participant || from
                    const senderNumber = sender.split('@')[0]
                    
                    // Check if user has anti-delete enabled
                    if (db[senderNumber]?.antidelete) {
                        try {
                            await sock.sendMessage(sender, {
                                text: `🗑️ *Anti Delete Alert*\n\nSomeone deleted a message in the chat.\n\nMessage was removed.`
                            })
                        } catch (err) {}
                    }
                }
            }
        })

        // Always Online feature - send presence updates
        setInterval(() => {
            try {
                // Check each user's setting
                Object.keys(db).forEach(async (userNumber) => {
                    if (db[userNumber]?.alwaysonline && sock.user?.id) {
                        try {
                            await sock.sendPresenceUpdate('available')
                        } catch (err) {}
                    }
                })
            } catch (err) {}
        }, 25000)

        // Save credentials
        sock.ev.on('creds.update', saveCreds)

    } catch (err) {
        console.log('❌ Error:', err.message)
        setTimeout(startBot, 5000)
    }
}

// Error handling
process.on('uncaughtException', (err) => {
    console.log('⚠️ Uncaught Exception:', err.message)
})

process.on('unhandledRejection', (err) => {
    console.log('⚠️ Unhandled Rejection:', err.message)
})

// Start bot
startBot()
