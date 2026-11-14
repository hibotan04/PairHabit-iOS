import WidgetKit
import SwiftUI
import AppIntents

// Extension for Hex Color
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// Tiny locale helper for widget fallback strings (follows device language)
func L(_ ja: String, _ en: String) -> String {
    (Locale.preferredLanguages.first ?? "en").hasPrefix("ja") ? ja : en
}

// MARK: - Data Models

struct WidgetData: Decodable {
    let themeColor: String
    let currency: String
    let goal: WidgetGoal?
    let habits: [WidgetHabit]
    let lastUpdated: String
    let weekStartDay: Int // 0: Sun, 1: Mon
}

struct WidgetGoal: Decodable {
    let label: String
    let current: Int
    let target: Int
}

struct WidgetHabit: Decodable, Identifiable {
    let id: String
    let name: String
    let emoji: String?
    let completedToday: Bool
    let color: String
    let amount: Int
    let history: [Bool]
}

// ... (HabitEntity/Query same) ...



// MARK: - App Intents (Configurability)

struct HabitEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Habit"
    static var defaultQuery = HabitQuery()

    var id: String
    var name: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(stringLiteral: name)
    }
}

struct HabitQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [HabitEntity] {
        let habits = fetchHabitsFromUserDefaults()
        return habits.filter { identifiers.contains($0.id) }.map { HabitEntity(id: $0.id, name: $0.name) }
    }

    func suggestedEntities() async throws -> [HabitEntity] {
         let habits = fetchHabitsFromUserDefaults()
         return habits.map { HabitEntity(id: $0.id, name: $0.name) }
    }
    
    // Helper to fetch habits
    func fetchHabitsFromUserDefaults() -> [WidgetHabit] {
        let userDefaults = UserDefaults(suiteName: "group.com.habitpot.mobile")
        if let dataString = userDefaults?.string(forKey: "widgetData"),
           let widgetData = try? JSONDecoder().decode(WidgetData.self, from: dataString.data(using: .utf8)!) {
            return widgetData.habits
        }
        return []
    }
}

enum WidgetTheme: String, AppEnum {
    case habitColor = "Habit Color"
    // Mocha Palette
    case mocha = "Mocha"
    // Sakuramochi Palette (Pink)
    case sakuramochi = "Sakuramochi"
    // Basic Colors
    case blue = "Blue"
    case green = "Green"
    case orange = "Orange"
    case purple = "Purple"
    
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Theme Color"
    
    static var caseDisplayRepresentations: [WidgetTheme: DisplayRepresentation] {
        [
            .habitColor: "Habit Color",
            .mocha: "Mocha (Brown)",
            .sakuramochi: "Sakuramochi (Pink)",
            .blue: "Blue",
            .green: "Green",
            .orange: "Orange",
            .purple: "Purple"
        ]
    }
    
    func color(defaultColor: String) -> Color {
        switch self {
        case .habitColor: return Color(hex: defaultColor)
        case .mocha: return Color(hex: "#8f7161")
        case .sakuramochi: return Color(hex: "#f0bfb1")
        case .blue: return Color.blue
        case .green: return Color.green
        case .orange: return Color.orange
        case .purple: return Color.purple
        }
    }
}



// MARK: - Providers

enum ValueDisplayMode: String, AppEnum {
    case hidden = "Hidden"
    case amount = "Unit Amount"
    case total = "Total Earned"
    
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Display Mode"
    
    static var caseDisplayRepresentations: [ValueDisplayMode: DisplayRepresentation] {
        [
            .hidden: "Hidden",
            .amount: "Unit Amount (e.g. +10)",
            .total: "Total Earned (e.g. Total: 300)"
        ]
    }
}

enum HabitLabelStyle: String, AppEnum {
    case emoji = "Emoji"
    case name = "Name"
    
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Label Style"
    
    static var caseDisplayRepresentations: [HabitLabelStyle: DisplayRepresentation] {
        [
            .emoji: "Emoji",
            .name: "Name"
        ]
    }
}

// ... (WidgetTheme enum remains same) ...

struct HabitSelectionIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Widget Configuration"
    static var description: IntentDescription = "Configure the habit and theme."

    @Parameter(title: "Habit")
    var habit: HabitEntity?
    
    @Parameter(title: "Theme", default: .habitColor)
    var theme: WidgetTheme
    
    @Parameter(title: "Background", default: .habitColor)
    var backgroundColor: WidgetTheme
    
    @Parameter(title: "Display Mode", default: .total)
    var displayMode: ValueDisplayMode

    @Parameter(title: "Label Style", default: .emoji)
    var labelStyle: HabitLabelStyle
}

struct SummaryConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Summary Configuration"
    static var description: IntentDescription = "Configure the summary theme."

    @Parameter(title: "Theme", default: .habitColor)
    var theme: WidgetTheme
    
    @Parameter(title: "Background", default: .habitColor)
    var backgroundColor: WidgetTheme
    
    @Parameter(title: "Display Mode", default: .total)
    var displayMode: ValueDisplayMode

    @Parameter(title: "Label Style", default: .emoji)
    var labelStyle: HabitLabelStyle
}

// ... (Mark Providers) ...

// 1. Static Provider
struct MainProvider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), data: BlockData.previewData)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        completion(SimpleEntry(date: Date(), data: BlockData.previewData))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let data = fetchData()
        let entry = SimpleEntry(date: Date(), data: data)
        // [Optimized] Use .atEnd to request update immediately after this entry expires/is shown
        // Combine with .after check to prevent excessive refresh loops if needed, but .atEnd is better for event-driven
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
    
    func fetchData() -> WidgetData? {
        let userDefaults = UserDefaults(suiteName: "group.com.habitpot.mobile")
        // [Optimized] Read as Data directly for robustness
        if let data = userDefaults?.data(forKey: "widgetData"),
           let widgetData = try? JSONDecoder().decode(WidgetData.self, from: data) {
            return widgetData
        }
        // Fallback for logic where string might have been saved
        if let dataString = userDefaults?.string(forKey: "widgetData"),
           let widgetData = try? JSONDecoder().decode(WidgetData.self, from: dataString.data(using: .utf8)!) {
             return widgetData
        }
        return nil
    }
}

// 2. Intent Provider (Small - Stats)
struct StatsProvider: AppIntentTimelineProvider {
    typealias Entry = StatsEntry
    typealias Intent = HabitSelectionIntent

    func placeholder(in context: Context) -> StatsEntry {
        StatsEntry(date: Date(), data: BlockData.previewData, selectedHabitId: nil, theme: .habitColor, backgroundColor: .habitColor, displayMode: .amount, labelStyle: .emoji)
    }

    func snapshot(for configuration: HabitSelectionIntent, in context: Context) async -> StatsEntry {
        StatsEntry(date: Date(), data: BlockData.previewData, selectedHabitId: configuration.habit?.id, theme: configuration.theme, backgroundColor: configuration.backgroundColor, displayMode: configuration.displayMode, labelStyle: configuration.labelStyle)
    }

    func timeline(for configuration: HabitSelectionIntent, in context: Context) async -> Timeline<StatsEntry> {
        let data = MainProvider().fetchData()
        let entry = StatsEntry(date: Date(), data: data, selectedHabitId: configuration.habit?.id, theme: configuration.theme, backgroundColor: configuration.backgroundColor, displayMode: configuration.displayMode, labelStyle: configuration.labelStyle)
        return Timeline(entries: [entry], policy: .atEnd)
    }
}

// 3. Summary Provider (Medium - Tracker)
struct SummaryProvider: AppIntentTimelineProvider {
    typealias Entry = SummaryEntry
    typealias Intent = SummaryConfigurationIntent

    func placeholder(in context: Context) -> SummaryEntry {
        SummaryEntry(date: Date(), data: BlockData.previewData, theme: .habitColor, backgroundColor: .habitColor, displayMode: .amount, labelStyle: .emoji)
    }

    func snapshot(for configuration: SummaryConfigurationIntent, in context: Context) async -> SummaryEntry {
        SummaryEntry(date: Date(), data: BlockData.previewData, theme: configuration.theme, backgroundColor: configuration.backgroundColor, displayMode: configuration.displayMode, labelStyle: configuration.labelStyle)
    }

    func timeline(for configuration: SummaryConfigurationIntent, in context: Context) async -> Timeline<SummaryEntry> {
        let data = MainProvider().fetchData()
        let entry = SummaryEntry(date: Date(), data: data, theme: configuration.theme, backgroundColor: configuration.backgroundColor, displayMode: configuration.displayMode, labelStyle: configuration.labelStyle)
        return Timeline(entries: [entry], policy: .atEnd)
    }
}

// MARK: - Entries

struct SimpleEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?
}

struct StatsEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?
    let selectedHabitId: String?
    let theme: WidgetTheme
    let backgroundColor: WidgetTheme
    let displayMode: ValueDisplayMode
    let labelStyle: HabitLabelStyle
}

struct SummaryEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?
    let theme: WidgetTheme
    let backgroundColor: WidgetTheme
    let displayMode: ValueDisplayMode
    let labelStyle: HabitLabelStyle
}

// MARK: - Preview Data

struct BlockData {
    // Preview shown in the widget gallery — follow the device language.
    static var previewData: WidgetData {
        let isJa = (Locale.preferredLanguages.first ?? "en").hasPrefix("ja")
        return WidgetData(
            themeColor: "#8f7161",
            currency: "pt",
            goal: WidgetGoal(label: isJa ? "目標" : "Goal", current: 5, target: 10),
            habits: [
                WidgetHabit(id: "1", name: isJa ? "運動" : "Run", emoji: "🏃", completedToday: true, color: "#A388E6", amount: 10, history: Array(repeating: true, count: 30)),
                WidgetHabit(id: "2", name: isJa ? "読書" : "Read", emoji: "📖", completedToday: false, color: "#6CB3FF", amount: 20, history: Array(repeating: false, count: 30))
            ],
            lastUpdated: "",
            weekStartDay: 0
        )
    }
}

// MARK: - Views

// MARK: - Views

// 1. Summary Widget View (Medium) - Tracker
struct HabitSummaryWidgetEntryView : View {
    var entry: SummaryProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if let data = entry.data {
             switch family {
             case .systemMedium:
                 WeeklyTrackerWidgetView(data: data, theme: entry.theme, backgroundColor: entry.backgroundColor, displayMode: entry.displayMode, labelStyle: entry.labelStyle)
             default:
                 Text(L("非対応サイズ", "Unsupported"))
             }
        } else {
            VStack {
                Text("HabitPot")
                Text(L("データなし", "No Data")).font(.caption).foregroundColor(.secondary)
            }
            .containerBackground(for: .widget) { Color.white }
        }
    }
}

struct WeeklyTrackerWidgetView: View {
    let data: WidgetData
    let theme: WidgetTheme
    let backgroundColor: WidgetTheme
    let displayMode: ValueDisplayMode
    let labelStyle: HabitLabelStyle
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        let themeColor = theme.color(defaultColor: data.themeColor)
        let bg = backgroundColor.color(defaultColor: "#FFFFFF")
        let bgColor = backgroundColor == .habitColor ? Color.white : bg
        let textColor = (backgroundColor != .habitColor) ? Color.white : Color.black
        
        let displayHabits = Array(data.habits.prefix(5))
        
        // Week Date Logic
        let calendar = Calendar.current
        let today = Date()
        let currentWeekday = calendar.component(.weekday, from: today) // 1=Sun
        let targetStart = (data.weekStartDay == 0) ? 1 : 2
        var diff = currentWeekday - targetStart
        if diff < 0 { diff += 7 }
        let startOfWeek = calendar.date(byAdding: .day, value: -diff, to: today) ?? today
        
        let weekDates = (0..<7).map { calendar.date(byAdding: .day, value: $0, to: startOfWeek) ?? today }
        
        // Formatter (follow the device language)
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "E"
        
        return VStack(spacing: 8) {
            // Header Row
            HStack {
                 if labelStyle == .emoji {
                      Spacer().frame(width: 25)
                 } else {
                      Spacer().frame(width: 45)
                 }
                 if displayMode != .hidden {
                      Spacer().frame(width: 35)
                 }
                 Spacer() 
                 
                 HStack(spacing: 3) {
                     SwiftUI.ForEach(0..<7, id: \.self) { i in
                         let isToday = calendar.isDate(weekDates[i], inSameDayAs: today)
                         Text(String(formatter.string(from: weekDates[i]).prefix(1)))
                             .font(.system(size: 8, weight: .bold))
                             .foregroundColor(isToday ? .white : .gray)
                             .opacity(isToday ? 1.0 : 0.8)
                             .frame(width: 20, height: 20, alignment: .center)
                             .background(isToday ? Circle().fill(themeColor) : nil)
                     }
                 }
            }

            // HABIT LIST
            VStack(spacing: 5) {
                SwiftUI.ForEach(displayHabits) { (habit: WidgetHabit) in
                     let rowColor = themeColor
                     
                     HStack {
                         // LABEL COLUMN
                         if labelStyle == .emoji {
                             Text(habit.emoji ?? "📝")
                                 .font(.system(size: 14))
                                 .frame(width: 25, alignment: .center)
                         } else {
                             Text(habit.name)
                                 .font(.system(size: 10, weight: .bold))
                                 .foregroundColor(textColor)
                                 .lineLimit(2)
                                 .minimumScaleFactor(0.7)
                                 .frame(width: 45, alignment: .leading)
                         }
                         
                         if displayMode != .hidden {
                             let textValue: String = {
                                 if displayMode == .amount {
                                     return "\(habit.amount)"
                                 } else {
                                     let completedCount = habit.history.filter { $0 }.count
                                     return "\(habit.amount * completedCount)"
                                 }
                             }()
                             
                             Text("\(data.currency)\(textValue)")
                                 .font(.system(size: 9, weight: .bold))
                                 .foregroundColor(themeColor)
                                 .frame(width: 35, alignment: .leading)
                         }
                         
                         Spacer()
                         
                         HStack(spacing: 3) {
                             SwiftUI.ForEach(0..<7, id: \.self) { i in
                                 DayCircleView(date: weekDates[i], history: habit.history, color: rowColor)
                             }
                         }
                     }
                }
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 16)
        .containerBackground(for: .widget) { 
            bgColor
        }
    }
}

// 2. New Stats Widget View (Small)
struct HabitStatsWidgetEntryView: View {
    var entry: StatsProvider.Entry
    
    var body: some View {
        if let data = entry.data {
            let habit = data.habits.first { $0.id == entry.selectedHabitId } ?? data.habits.first
            
            if let habit = habit {
                let theme = entry.theme.color(defaultColor: habit.color)
                let bg = entry.backgroundColor == .habitColor ? Color.white : entry.backgroundColor.color(defaultColor: "#FFFFFF")
                let textColor = (entry.backgroundColor != .habitColor) ? Color.white : Color.black
                
                VStack(spacing: 0) { 
                    // Header
                    HStack(spacing: 4) {
                        // Label (Mutually Exclusive based on setting)
                        if entry.labelStyle == .emoji {
                            Text(habit.emoji ?? "📝")
                                .font(.system(size: 14)) // Smaller Emoji
                        } else {
                            Text(habit.name)
                                .font(.system(size: 12, weight: .bold)) 
                                .foregroundColor(textColor)
                                .lineLimit(2)
                                .minimumScaleFactor(0.7)
                        }
                        
                        Spacer()
                        
                        // Amount (Right aligned)
                        if entry.displayMode != .hidden {
                             let textValue: String = {
                                 if entry.displayMode == .amount {
                                     return "\(habit.amount)"
                                 } else {
                                     let total = habit.history.filter { $0 }.count * habit.amount
                                     return "\(total)"
                                 }
                             }()
                            Text("\(data.currency)\(textValue)")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(theme)
                        }
                    }
                    .padding(.bottom, 6) 
                    
                    // Calendar Grid
                    let today = Date()
                    let calendar = Calendar.current
                    
                    // First day of current month
                    let components = calendar.dateComponents([.year, .month], from: today)
                    let startOfMonth = calendar.date(from: components)!
                    
                    let firstWeekday = calendar.component(.weekday, from: startOfMonth)
                    let offset = firstWeekday - 1
                    
                    // Localized single-letter weekday symbols (Sunday-first), follows device language
                    let weekdays = Calendar.current.veryShortStandaloneWeekdaySymbols
                    let columns = Array(repeating: GridItem(.fixed(14), spacing: 4), count: 7)
                    
                    VStack(spacing: 0) {
                        // 1. Weekday Grid (Tighter bottom)
                        LazyVGrid(columns: columns, spacing: 0) { 
                            SwiftUI.ForEach(0..<weekdays.count, id: \.self) { i in
                                Text(weekdays[i])
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                            }
                        }
                        .padding(.bottom, 2) // Small gap between Headers and First Row
                        
                        // 2. Dots Grid (Loose rows)
                        LazyVGrid(columns: columns, spacing: 5) { 
                            // Empty cells before start
                            SwiftUI.ForEach(0..<offset, id: \.self) { _ in
                                Color.clear.frame(height: 14) 
                            }
                            
                            // Days
                            SwiftUI.ForEach(0..<habit.history.count, id: \.self) { i in
                                let completed = habit.history[i]
                                
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(completed ? theme : theme.opacity(0.1))
                                    .frame(height: 14) 
                            }
                        }
                    }
                }
                .padding(8) 
                .containerBackground(for: .widget) { bg }
                
            } else {
                Text(L("習慣を選択", "Select Habit"))
                    .containerBackground(for: .widget) { Color.white }
            }
        } else {
             Text(L("データなし", "No Data"))
                .containerBackground(for: .widget) { Color.white }
        }
    }
}

// 3. New Checklist Widget View (Medium)
struct HabitChecklistWidgetEntryView: View {
    var entry: SummaryProvider.Entry // Reuse Summary Provider
    
    var body: some View {
        if let data = entry.data {
             HabitChecklistView(data: data, theme: entry.theme, backgroundColor: entry.backgroundColor)
        } else {
            VStack {
                Text("HabitPot")
                Text(L("データなし", "No Data")).font(.caption).foregroundColor(.secondary)
            }
            .containerBackground(for: .widget) { Color.white }
        }
    }
}

struct HabitChecklistView: View {
    let data: WidgetData
    let theme: WidgetTheme
    let backgroundColor: WidgetTheme
    
    var body: some View {
        let themeColor = theme.color(defaultColor: data.themeColor)
        let bg = backgroundColor.color(defaultColor: "#FFFFFF")
        let bgColor = backgroundColor == .habitColor ? Color.white : bg
        let textColor = (backgroundColor != .habitColor) ? Color.white : Color.black

        let displayHabits = data.habits.prefix(4) // Show up to 4 habits for space
        
        VStack(alignment: .leading, spacing: 10) {
             Text(getDateString())
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(themeColor)
            
            VStack(alignment: .leading, spacing: 8) {
                SwiftUI.ForEach(displayHabits) { (habit: WidgetHabit) in
                    HStack(spacing: 8) {
                        Image(systemName: habit.completedToday ? "checkmark.square.fill" : "square")
                            .foregroundColor(habit.completedToday ? themeColor : Color.gray.opacity(0.4))
                            .font(.system(size: 18))
                        
                        Text(habit.name)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(textColor)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        Text("\(data.currency)\(habit.amount)")
                             .font(.system(size: 10, weight: .bold))
                             .foregroundColor(themeColor.opacity(0.8))
                    }
                }
            }
            Spacer()
        }
        .padding(16)
        .containerBackground(for: .widget) { bgColor }
    }
    
    func getDateString() -> String {
        // Follow the device language: builds a locale-appropriate
        // month/day/weekday string (e.g. ja: "6月7日(土)", en: "Sat, Jun 7").
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.setLocalizedDateFormatFromTemplate("MMMdEEE")
        return formatter.string(from: Date())
    }
}


// 4. Goal Progress Widget View (Small) - Visualizer
struct GoalProgressWidgetEntryView: View {
    var entry: SummaryProvider.Entry // Reuse Summary Provider for Goal Data
    
    var body: some View {
        if let data = entry.data, let goal = data.goal {
             GoalProgressView(goal: goal, theme: entry.theme, backgroundColor: entry.backgroundColor)
        } else {
            VStack {
                Text("HabitPot")
                Text(L("目標なし", "No Goal")).font(.caption).foregroundColor(.secondary)
            }
            .containerBackground(for: .widget) { Color.white }
        }
    }
}

struct GoalProgressView: View {
    let goal: WidgetGoal
    let theme: WidgetTheme
    let backgroundColor: WidgetTheme
    
    var body: some View {

        let themeColor = theme.color(defaultColor: "#8f7161")
        let bg = backgroundColor.color(defaultColor: "#FFFFFF")
        let bgColor = backgroundColor == .habitColor ? Color.white : bg
        let textColor = (backgroundColor != .habitColor) ? Color.white : Color.black
        
        let progress = Double(goal.current) / Double(max(1, goal.target))
        
        VStack(spacing: 4) {
            // Circular Progress (Expanded)
            ZStack {
                // Track
                Circle()
                    .stroke(lineWidth: 10) // Slightly thicker
                    .opacity(0.15)
                    .foregroundColor(themeColor)
                
                // Progress
                Circle()
                    .trim(from: 0.0, to: CGFloat(min(progress, 1.0)))
                    .stroke(style: StrokeStyle(lineWidth: 10, lineCap: .round, lineJoin: .round))
                    .foregroundColor(themeColor)
                    .rotationEffect(Angle(degrees: 270.0))
                    .animation(.linear, value: progress)
                
                // Center Text
                VStack(spacing: 0) {
                    Text("\(Int(progress * 100))%")
                        .font(.system(size: 20, weight: .bold)) // Larger
                        .foregroundColor(textColor)
                    Text("\(goal.current)/\(goal.target)")
                        .font(.system(size: 9))
                        .foregroundColor(textColor.opacity(0.6))
                }
            }
            // Removed padding(4) to max size
            
            // Goal Name
            Text(goal.label)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(textColor)
                .lineLimit(1)
        }
        .padding(8) // Reduced outer padding
        .containerBackground(for: .widget) { bgColor }
    }
}

// MARK: - Widgets

struct HabitSummaryWidget: Widget {
    let kind: String = "HabitWidget" // Keep legacy ID

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SummaryConfigurationIntent.self, provider: SummaryProvider()) { entry in
             HabitSummaryWidgetEntryView(entry: entry)
        }
        .configurationDisplayName(L("習慣の履歴", "Habit History"))
        .description(L("習慣の履歴を確認できます。", "Track your habits history."))
        .supportedFamilies([.systemMedium])
    }
}

struct HabitStatsWidget: Widget {
    let kind: String = "HabitStatsWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: HabitSelectionIntent.self, provider: StatsProvider()) { entry in
            HabitStatsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName(L("習慣の統計", "Habit Stats"))
        .description(L("特定の習慣の月間統計。", "Monthly statistics for a specific habit."))
        .supportedFamilies([.systemSmall])
    }
}

struct HabitChecklistWidget: Widget {
    let kind: String = "HabitChecklistWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SummaryConfigurationIntent.self, provider: SummaryProvider()) { entry in
            HabitChecklistWidgetEntryView(entry: entry)
        }
        .configurationDisplayName(L("習慣チェックリスト", "Habit Checklist"))
        .description(L("今日の習慣リスト。", "Today's habit list."))
        .supportedFamilies([.systemMedium, .systemSmall])
    }
}

struct GoalProgressWidget: Widget {
    let kind: String = "GoalProgressWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SummaryConfigurationIntent.self, provider: SummaryProvider()) { entry in
            GoalProgressWidgetEntryView(entry: entry)
        }
        .configurationDisplayName(L("目標の進捗", "Goal Progress"))
        .description(L("次の目標までの進捗を表示します。", "Visualize progress towards your next goal."))
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Bundle

@main
struct HabitPotWidgetBundle: WidgetBundle {
    var body: some Widget {
        HabitStatsWidget() // Small - Habit
        HabitSummaryWidget() // Medium - History
        HabitChecklistWidget() // Medium/Small - Checklist
        GoalProgressWidget() // Small - Goal
    }
}



// Helper View for Weekly Tracker
// Helper View for Weekly Tracker Circle
struct DayCircleView: View {
    let date: Date
    let history: [Bool]
    let color: Color
    
    var body: some View {
        let calendar = Calendar.current
        let currentMonth = calendar.component(.month, from: Date())
        let targetMonth = calendar.component(.month, from: date)
        
        // Define styles
        let missedColor = Color.gray.opacity(0.15)
        let futureColor = Color.gray.opacity(0.15)
        
        if currentMonth == targetMonth {
            let day = calendar.component(.day, from: date)
            let index = day - 1
            
            if index >= 0 && index < history.count {
                let completed = history[index]
                // Combine missed/future to same faint color
                RoundedRectangle(cornerRadius: 5)
                    .fill(completed ? color : futureColor)
                    .frame(width: 20, height: 20)
            } else {
                // Should not happen if history covers month
                RoundedRectangle(cornerRadius: 5)
                    .fill(futureColor)
                    .frame(width: 20, height: 20)
            }
        } else {
            // Different month (blank placeholder)
            RoundedRectangle(cornerRadius: 5)
                .fill(Color.clear)
                .frame(width: 20, height: 20)
                .overlay(
                    RoundedRectangle(cornerRadius: 5)
                        .stroke(Color.gray.opacity(0.1), lineWidth: 1)
                )
        }
    }
}
