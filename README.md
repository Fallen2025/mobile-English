# External Phone 3.0 — English UI fork

English-UI fork of [yexiaoxiaoye/mobile](https://github.com/yexiaoxiaoye/mobile) (外置手机 3.0) by 沉淀/夜宵宵夜.

This repo keeps the original plugin and adds:

- `english-boot.js` — loads from any extension folder name (not only `mobile`)
- `i18n.js` — English labels on the home screen and common chrome

Install via SillyTavern → Extensions → Install Extension → `https://github.com/Fallen2025/mobile-English.git`

Do not run this and upstream `yexiaoxiaoye/mobile` at the same time. Overlay language: `MobileI18n.setLang('en')` or `'zh'`. See [ENGLISH.md](ENGLISH.md).

---

# SillyTavern Mobile Plugin 📱

A full-featured mobile interface simulation plugin designed for SillyTavern, offering a rich app ecosystem and a smart interactive experience.

## 🚀 Feature Overview

### 📱 Core Features
- **Simulated Mobile Interface**: A complete iOS-style mobile interface that supports drag-and-drop and touch operations
- **Smart Context Monitoring**: Monitors SillyTavern events in real time and automatically syncs chat data
- **Multi-App Ecosystem**: 9 fully functional apps covering scenarios such as social networking, shopping, and task management
- **Data Parsing System**: A powerful AI-powered response parsing engine that automatically extracts structured data
- **History Storage**: A comprehensive system for storing user behavior and data history

## 📋 App Overview

### 💬 Messages App
**Core Features**:
- **Chat History Management**: Automatically syncs all chat histories from SillyTavern
- **Moments Feature**: Displays character updates and interactive content
- **Smart Avatar System**: Automatically extracts and displays character avatars
- **Real-Time Message Synchronization**: Automatically updates after AI replies, no manual refreshing required
- **Group Chat Support**: Complete display and management of group chat messages

**Technical Features**:
- Uses DOM observers to monitor message changes in real time
- Supports standardized processing of message structures
- Intelligently identifies senders and recipients

### 🛒 Shopping App (Shop)
**Core Features**:
- **Product Browsing**: Displays AI-generated product information
- **Shopping Cart Management**: Add, remove, and modify product quantities
- **Order Processing**: Generates orders and sends them to SillyTavern
- **Balance Management**: Automatically calculates and updates user balances
- **Purchase History**: Records all purchase activities

**Data Format**:
```
[Product|Product Name|Price|Type|Description]
[Purchase|Product Name|Quantity|Total Price]
```

### 📋 Task App (Task)
**Core Features**:
- **Task List Management**: Displays available, accepted, and completed tasks
- **Task Status Tracking**: Automatically parses changes in task status from AI replies
- **Reward System**: Handles the distribution of rewards upon task completion
- **Point Calculation**: Calculates user task points in real time

**Data Format**:
```
[Task|Task ID|Task Name|Description|Poster|Reward]
[Accept Task|Task ID|Task Name|Description|Poster|Reward]
[Complete Task|Task ID|Task Name|Reward]
```

### 🗣️ Forum App (Forum)
**Core Features**:
- **Post Browsing**: Displays forum posts and replies
- **Posting**: Users can post new threads
- **Interaction System**: Like, reply, and share features
- **Third-Party API Support**: Supports integration with external forum APIs

**Technical Features**:
- Supports iframe embedding of external forum pages
- Smart parsing of forum data formats
- Real-time updates to post status

### 👁️ Weibo App (Weibo)
**Core Features**:
- **Weibo Browsing**: Displays Weibo feeds and trending topics
- **Posting Weibo**: Users can post updates
- **Interaction Features**: Likes, reposts, and comments
- **Trending Topics**: Displays current trending topics

### 🎬 Live Streaming App (Live)
**Core Features**:
- **Live Stream List**: Displays currently active live streams
- **Watch Live Streams**: Enter a live stream to watch content
- **Bullet Chat Interaction**: Send bullet comments and gifts
- **Secondary API Support**: Supports APIs from external live streaming platforms

**Data Format**:
```
[Live Stream|Stream Name|Streamer Username|Stream Category|Viewers]
[Live Comments|Username|Comment Content]
[Gifts|Username|Gift Name|Quantity]
```

### 🎒 Backpack App (Backpack)
**Core Features**:
- **Item Management**: Displays all items owned by the user
- **Item Categorization**: Automatically categorizes items by type
- **Item Usage**: Supports item usage and consumption
- **Quantity Tracking**: Displays item quantities in real time

**Data Format**:
```
[Backpack|Item Name|Item Type|Description|Quantity]
[Item Usage|Item Name|Target|Usage Method|Quantity]
```

### 🔌 API App (API)
**Core Features**:
- **API Interface Management**: Manage connections to various external APIs
- **Data Synchronization**: Synchronize data with external services
- **API Testing**: Test API connection status
- **Configuration Management**: Manage API keys and settings

**Design Highlights**:
- Supports multiple API protocols and formats

### ⚙️ Settings App (Settings)
**Core Features**:
- **Interface Configuration**: Customize the app’s appearance
- **Background Settings**: Change the app’s background image
- **Feature Toggles**: Control the enabled status of various features
- **Data Management**: Clear cache and reset settings

## 🔧 Core Technical Features

### 🎯 Drag-and-Drop Functionality
- **Universal Drag-and-Drop System**: Supports dragging phone buttons and interface elements
- **Smart Boundary Detection**: Prevents dragging outside the screen boundaries
- **Touch Optimization**: Seamless support for both PC and mobile operations
- **Click Protection**: Ensures dragging does not interfere with normal click functionality

### 👂 Contextual Listening
- **Real-time Event Listening**: Monitors all key events in SillyTavern
- **Smart Anti-Jitter Mechanism**: Prevents performance issues caused by frequent updates
- **Multi-layered Detection Mechanism**: DOM observers + event listeners + periodic checks
- **Automatic Synchronization**: Automatically updates relevant app data after AI responses

### 🌐 Secondary API Support
- **Forum API**: Supports integration with external forum systems
- **Live Streaming API**: Supports data retrieval from external live streaming platforms
- **Unified Data Formats**: Automatically converts data formats from different APIs
- **Error Handling**: Comprehensive error handling mechanism for API calls

### 💾 History Storage
- **Local Storage**: Uses localStorage to save user data
- **Data Persistence**: Complete records of app status and user behavior
- **Smart Cleanup**: Automatically cleans up expired and invalid data
- **Backup and Restore**: Supports data export and import functions

### 🔍 Data Parsing System
- **Smart Parsing Engine**: Automatically identifies structured data in AI responses
- **Multi-Format Support**: Supports various data formats, including tasks, products, inventory, and live streams
- **Fault Tolerance**: Intelligently repairs data with formatting errors
- **Real-Time Updates**: Immediately updates the corresponding application upon completion of parsing

## 📦 Installation and Usage

### Installation Steps
1. Place the plugin folder in the SillyTavern extensions directory.
2. Restart SillyTavern or refresh the page.
3. The plugin will load automatically and display a phone icon in the lower-right corner of the page.

### How to Use
1. **Launch the Phone Interface**: Tap the phone button in the bottom-right corner
2. **Drag and Drop**: Long-press the phone button or the status bar to drag and move it
3. **Switch Apps**: Tap an app icon to access its corresponding features
4. **Return to the Home Screen**: Tap the back button within the app

## 🔧 Development Notes

### File Structure
```
mobile/
├── index.js                 # Main entry point file
├── manifest.json           # Plugin configuration file
├── mobile-phone.js         # Core logic for the mobile interface
├── mobile-phone.css        # Styles for the mobile interface
├── drag-helper.js          # Implementation of drag-and-drop functionality
├── apps/                   # Application module directory
│   ├── data-extractor.js   # Data extractor
│   ├── context-watcher.js  # Context listener
│   ├── message-app.js      # Messaging app
│   ├── shop-app.js         # Shopping app
│   ├── task-app.js         # Task app
│   ├── backpack-app.js     # Backpack App
│   └── ...                 # Other app files
└── styles/                 # Style file directory
    ├── main.css            # Main style sheet
    └── ...                 # App-specific styles
```

### Development Extensions
- **Modular Design**: Each application is developed independently for easier maintenance
- **Unified API**: All applications follow the same interface specifications
- **Event-Driven Architecture**: Inter-application communication is implemented via an event system
- **Plugin-Based Extensions**: Supports third-party developers in adding new applications

## 📄 License

This project is licensed under the MIT License. For details, see the [LICENSE](LICENSE) file.

## 🔍 SillyTavern Event Listening and Data Parsing System

### Core Monitoring Mechanisms
- **DOM Mutation Observers**: Monitor changes to the HTML structure of the chat area
- **SillyTavern Event System**: Monitor built-in events (message sending, receiving, rendering, etc.)
- **Periodic Polling**: Check for changes in the number of messages every second as a fallback mechanism
- **Streaming Detection**: Special handling of the AI’s streaming response process

### Data Parsing Process
1. **Event Trigger**: Detects new messages or context changes
2. **Data Extraction**: Extracts message content and metadata from the DOM
3. **Format Parsing**: Identifies data tags in specific formats
4. **Structured Processing**: Converts data into a structure usable by the application
5. **App Notification**: Notify relevant apps to update their display

### Supported Data Formats
```javascript
// Task Format
[Task|ID|Name|Description|Publisher|Reward]
[Accept Task|ID|Name|Description|Publisher|Reward]
[Complete Task|ID|Name|Reward]

// Product Format
[Product|Name|Price|Type|Description]
[Purchase|Product Name|Quantity|Total Price]

// Inventory Format
[Inventory|Item Name|Type|Description|Quantity]
[Use Item|Item Name|Target|Usage|Quantity]

// Live Stream Format
[Live Stream|Stream Name|Streamer Username|Category|Viewers]
[Live Chat|Username|Chat Message]
[Gift|Username|Gift Name|Quantity]

// Forum Format
[Post|Title|Author|Content|Time|Likes]
[Reply|Post ID|Author|Content|Time]

// Friends Format
[Friend ID|Friend Name|QQ Number]
```

## 🎯 Advanced Features

### Smart Anti-Jitter Mechanism
- **Private Chat Mode**: 800 ms delay to ensure message integrity
- **Group Chat Mode**: 1500 ms delay to handle complex group chat scenarios
- **Streaming**: Special handling of AI-powered streaming replies to prevent update interruptions

### Performance Optimization Strategies
- **Lazy Loading**: The app loads content on demand to reduce initialization time
- **Memory Management**: Automatically cleans up unused data to prevent memory leaks
- **Caching Mechanism**: Intelligently caches frequently used data to improve response speed
- **Asynchronous Processing**: All time-consuming operations are executed asynchronously to prevent UI blocking

### Error Handling Mechanism
- **Fault-Tolerant Parsing**: Intelligently repairs data with formatting errors
- **Fallback Handling**: Provides alternative solutions when critical functions fail
- **Error Reporting**: Detailed error logs and debugging information
- **Automatic Recovery**: Automatically attempts recovery upon detecting an exception

## 🛠️ Troubleshooting

### Frequently Asked Questions
1. **Mobile Buttons Not Displaying**
   - Check if the plugin is installed correctly
   - Confirm that SillyTavern has fully loaded
   - Check the browser console for error messages

2. **App Data Not Updating**
   - Check if the context listener is working properly
   - Confirm that the AI response format is correct
   - Try manually refreshing the app

3. **Drag-and-drop not working properly**
   - Check if DragHelper has loaded correctly
   - Make sure there are no conflicts with other scripts
   - Try reinitializing the drag-and-drop functionality

### Debug Mode
Enable debugging in the browser console:
```javascript
// Enable global debugging
window.DEBUG_MOBILE_PHONE = true;

// Enable app-specific debugging
window.DEBUG_MESSAGE_APP = true;
window.DEBUG_TASK_APP = true;
window.DEBUG_SHOP_APP = true;
```

## 🤝 Contribute

Feel free to submit issues and pull requests to improve this project!

### Contribution Guide
1. Fork this project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m ‘Add some AmazingFeature’`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## 📞 Support and Feedback

If you encounter any issues while using the product or have suggestions for improvement, please:
- Submit a GitHub Issue
- Review the project documentation
- Join the community discussion

---

**Enjoy your smartphone experience!** 📱✨

*Make SillyTavern even more lively and fun!*
