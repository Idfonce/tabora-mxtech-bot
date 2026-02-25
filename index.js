const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const pino = require('pino')
const fs = require('fs')
const readline = require('readline')

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

// Global variable to track if we're already pairing
let isPairing = false

// Function to ask for phone number
async function askForPhoneNumber() {
    if (isPairing) return null // Prevent multiple pairing attempts
    
    isPairing = true
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    return new Promise((resolve) => {
        console.log('\n📱 ===== PAIRING CODE METHOD =====')
        console.log('Enter your phone number with country code')
        console.log('Example: 255623553450 (Tanzania)')
        console.log('================================\n')
        
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
            console.log('⏳ Timeout! Please restart the bot to try again.')
            rl.close()
            isPairing = false
            resolve(null)
        }, 30000) // 30 seconds timeout
        
        rl.question('📱 Phone number: ', (number) => {
            clearTimeout(timeout)
            rl.close()
            isPairing = false
            resolve(number.trim())
        })
    })
}

async function startBot() {
    // Check if already authenticated
    const { state, saveCreds } = await useMultiFileAuthState('./auth')
    
    // If already have credentials, skip pairing
    if (state.creds?.registered) {
        console.log('✅ Found existing session! Connecting...')
    }
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Tabora-MXtech', 'Chrome', '2.0.0'],
        markOnlineOnConnect: true,
        syncFullHistory: false,
        // Important: Don't auto-reconnect immediately
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000
    })

    // Flag to track if we've handled pairing
    let pairingDone = false

    // Handle connection
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        // Show QR as backup
        if (qr && !pairingDone && !state.creds?.registered) {
            console.log('\n📱 Alternative: Scan QR code if pairing fails:')
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'open') {
            console.log('\n✅ ==================================== ✅')
            console.log('   🎉 TABORA-MXTECH BOT CONNECTED! 🎉')
            console.log('✅ ==================================== ✅\n')
            
            // Start keep-alive interval
            setInterval(() => {
                try {
                    if (sock.user?.id) {
                        sock.sendPresenceUpdate('available')
                    }
                } catch (err) {}
            }, 20000)
            
            pairingDone = true
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ Bot logged out! Delete auth folder and restart.')
                process.exit(1)
            } else {
                // Don't reconnect if we're in pairing mode
                if (!pairingDone) {
                    console.log('⚠️ Connection issue. Waiting for pairing...')
                } else {
                    console.log('❌ Connection lost. Reconnecting in 5 seconds...')
                    setTimeout(() => startBot(), 5000)
                }
            }
        }
    })

    // Handle incoming messages (same as before)
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
        const args = text.slice(1).split(' ').slice(1)
        const arg = args[0]?.toLowerCase()
        
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
        
        // AUTO STATUS REACT
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
        
        // AUTO VIEW STATUS
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
        
        // ALWAYS ONLINE
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
        
        // ANTI DELETE
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
        
        if (msg.key && msg.key.remoteJid === 'status@broadcast') {
            const sender = msg.key.participant?.split('@')[0]
            
            if (db[sender]) {
                if (db[sender].autoviewstatus) {
                    try {
                        await sock.readMessages([msg.key])
                    } catch (err) {}
                }
                
                if (db[sender].autostatusreact) {
                    setTimeout(async () => {
                        try {
                            await sock.sendMessage('status@broadcast', {
                                react: {
                                    text: '❤️',
                                    key: msg.key
                                }
                            })
                        } catch (err) {}
                    }, 2000)
                }
            }
        }
    })

    // Save credentials
    sock.ev.on('creds.update', saveCreds)

    // ** PAIRING CODE FEATURE - Only if not already registered **
    if (!state.creds?.registered && !pairingDone) {
        try {
            // Wait a bit for connection to stabilize
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            const phoneNumber = await askForPhoneNumber()
            
            if (phoneNumber) {
                console.log(`\n⏳ Requesting pairing code for ${phoneNumber}...`)
                
                // Format phone number
                const cleanNumber = phoneNumber.replace(/\D/g, '')
                
                // Request pairing code
                const code = await sock.requestPairingCode(cleanNumber)
                
                console.log('\n✅ ==================================== ✅')
                console.log('   🔑 YOUR PAIRING CODE IS:')
                console.log(`   📱 ${code}`)
                console.log('✅ ==================================== ✅\n')
                
                console.log('📌 INSTRUCTIONS:')
                console.log('1. Open WhatsApp on your phone')
                console.log('2. Go to Settings → Linked Devices')
                console.log('3. Tap "Link a Device"')
                console.log('4. Enter this code: ' + code)
                console.log('5. Wait for connection...\n')
                
                pairingDone = true
            }
        } catch (err) {
            console.log('❌ Pairing failed:', err.message)
            console.log('📱 Please use QR code method instead')
            pairingDone = true
        }
    }
}

// Error handling
process.on('uncaughtException', (err) => {
    console.log('⚠️ Error:', err.message)
})
process.on('unhandledRejection', (err) => {
    console.log('⚠️ Rejection:', err.message)
})

// Start bot
startBot()
