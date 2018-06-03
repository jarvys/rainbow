require('react-virtualized/styles.css')
require('../css/style.css')

const {
    ipcRenderer,
    remote
} = require('electron')
const fs = remote.require('fs')

const mousetrap = require('mousetrap')
const React = require('react')
const ReactDOM = require('react-dom')
const {
    AutoSizer,
    List
} = require('react-virtualized')

const Labels = require('./Labels')
const Log = require('./Log')

const styles = {
    main: {
        display: 'flex',
        height: '100%',
        flexDirection: 'column'
    },
    toolbar: {
        padding: 10,
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'row'
    },
    logs: {
        flex: 1
    },
    gotoLineInput: {
        width: 160
    }
}

class Search extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            search: ''
        }
    }

    onKeyPress(e) {
        if (e.key == "Enter") {
            this.props.onSearch(this.state.search, e.shiftKey)
        }
    }

    render() {
        return (
            <div style={{ padding: '0px 10px' }}>
                <span>Search:&nbsp;</span>
                <input
                    type='text'
                    onKeyPress={this.onKeyPress.bind(this)}
                    className='input'
                    style={styles.gotoLineInput}
                    value={this.state.search}
                    onChange={e => this.setState({ search: e.target.value })}
                />
            </div>
        )
    }
}

class GoToLine extends React.Component {
    constructor(props) {
        super(props)
        this.state = { line: '' }
    }

    onKeyPress(e) {
        if (e.key == "Enter") {
            this.props.goto(this.state.line)
        }
    }

    render() {
        return (
            <div style={{ padding: '0px 10px', fontFamily: 'Helvetica' }}>
                <span>Line:&nbsp;</span>
                <input
                    onKeyPress={this.onKeyPress.bind(this)}
                    type='text'
                    className='input'
                    style={styles.gotoLineInput}
                    value={this.state.line}
                    onChange={e => this.setState({ line: e.target.value })}
                />
            </div>
        )
    }
}

class Filter extends React.Component {
    constructor(props) {
        super(props)
        this.state = { query: '' }
    }

    onKeyPress(e) {
        if (e.key == "Enter") {
            this.props.onFilter(this.state.query)
        }
    }

    componentDidUpdate() {
        if (this.props.focus) {
            this.input.focus()
        }
    }

    render() {
        return (
            <input
                ref={input => this.input = input}
                type='text'
                onKeyPress={this.onKeyPress.bind(this)}
                className='input'
                value={this.state.query}
                onChange={e => this.setState({ query: e.target.value })}
            />
        )
    }
}

class Main extends React.Component {
    constructor(options) {
        super(options)
        this.state = {
            activeFilter: false,
            query: '',
            scrollIndex: undefined,
            labels: [],
            logsRange: { startIndex: 0, stopIndex: 0 },
            logs: [], // origin logs
            filterLogs: []
        }
        this.temp = document.getElementById('temp')
    }

    readFile(path, callback) {
        const result = []

        const stream = fs.createReadStream(path, { encoding: 'utf-8' })
        let content = ''
        stream.on('data', chunk => {
            console.log('new data')
            content = content + chunk
            while (true) {
                let index = content.indexOf('\n')
                if (index === -1) {
                    break
                }

                const line = content.slice(0, index)
                result.push(line)
                content = content.slice(index + 1)
            }
        })
        stream.on('end', () => {
            console.log('end')
            callback(null, result)
        })
    }

    componentDidMount() {
        try {
            if (localStorage.logFile) {
                this.readFile(localStorage.logFile, (e, lines) => {
                    console.log('log read in')
                    this.reloadLogFile(lines)
                })
            }

            document.addEventListener('drop', e => {
                e.preventDefault()
                e.stopPropagation()

                const file = e.dataTransfer.files[0]
                localStorage.logFile = file.path
                this.readFile(localStorage.logFile, (e, lines) => {
                    console.log('log read in')
                    this.reloadLogFile(lines)
                })
            })

            document.addEventListener('dragover', e => {
                e.preventDefault()
                e.stopPropagation()
            })

            mousetrap.bind('command+f', () => {
                this.activeFilter()
            })
        } catch (e) {
            console.error(e)
        }
    }

    activeFilter() {
        this.setState({
            activeFilter: true
        })
    }

    fillNanoseondsForLog(log) {
        let time = log.data.time
        let r = /^(.+)\.(\d+)\+(.+)$/.exec(time)
        if (!r) {
            return
        }

        let nano = r[2]
        while (nano.length < 6) {
            nano = nano + '0'
        }
        const result = `${r[1]}.${nano}+${r[3]}`
        log.data.time = result
    }

    reloadLogFile(lines) {
        let counter = 1

        console.log('parse logs')
        let logs = lines.map(line => {
            try {
                const data = JSON.parse(line)
                if (!data) {
                    return null
                }

                return {
                    data
                }
            } catch (e) {
                return null
            }
        })

        console.log('filter logs')
        logs = logs.filter(Boolean)

        console.log('sort logs')
        logs.sort((l1, l2) => {
            const t1 = l1.data.time
            const t2 = l2.data.time
            if (t1 < t2) {
                return -1
            } else if (t1 === t2) {
                return 0
            } else {
                return 1
            }
        })

        console.log('process log nanosecond')
        logs.forEach(this.fillNanoseondsForLog)
        logs.forEach((log, index) => {
            log.id = index
        })

        const tailLines = []
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i]
            try {
                JSON.parse(line)
                break
            } catch (e) {
                tailLines.push(line)
            }
        }
        tailLines.reverse()

        tailLines.forEach((line, index) => {
            logs.push({
                id: logs.length,
                type: 'raw',
                data: {
                    text: line
                }
            })
        })

        this.setState({
            logs,
            filterLogs: logs,
            scrollIndex: undefined,
            query: '',
            pattern: new RegExp('')
        })
    }

    onLogClick(index) {
        return e => {
            const partial = {
                scrollIndex: index,
                showFullLog: e.metaKey
            }
            this.setState(partial)
        }
    }

    logRenderer({ index, key, style }) {
        let { logs, filterLogs, labels, scrollIndex } = this.state
        labels = labels.filter(label => label.text !== '')

        const log = filterLogs[index]
        return (
            <div key={key} style={style}>
                <Log
                    onClick={this.onLogClick(index)}
                    log={log}
                    index={index}
                    labels={labels}
                    highlight={scrollIndex === index}
                    full={scrollIndex === index && this.state.showFullLog}
                    total={logs.length}
                />
            </div>
        )
    }

    updateFilterIfNeed(query) {
        if (this.state.query === query) {
            return
        }

        if (!query) {
            this.setState({ query, pattern: null })
            return
        }

        try {
            const pattern = new RegExp(query)
            const filterLogs = this.state.logs.filter(log => {
                return pattern.test(Log.convertToText(log))
            })
            this.setState({ pattern, query, filterLogs, scrollIndex: undefined })
        } catch (e) {
            this.setState({ query })
        }
    }

    gotoLine(line) {
        const { filterLogs } = this.state
        line = parseInt(line)
        if (isNaN(line)) {
            return
        }

        if (line < 0) {
            line = filterLogs.length + line
        }
        this.setState({ scrollIndex: line })
    }

    buildLogIterator(logs, from, reverse) {
        if (!reverse) {
            return {
                cursor: from,
                hasNext() {
                    return this.cursor < logs.length
                },
                next() {
                    const log = logs[this.cursor]
                    const index = this.cursor
                    this.cursor++
                    return { log, index }
                }
            }
        } else {
            return {
                cursor: from,
                hasNext() {
                    return this.cursor >= 0
                },
                next() {
                    const log = logs[this.cursor]
                    const index = this.cursor
                    this.cursor--
                    return { log, index }
                }
            }
        }
    }

    searchLogs(logs, from, pattern, reverse) {
        let position = -1
        const logIter = this.buildLogIterator(logs, from, reverse)

        while (logIter.hasNext()) {
            const { log, index } = logIter.next()
            const logText = Log.convertToText(log)
            if (pattern.test(logText)) {
                position = index
                break
            }
        }

        return position
    }

    searchNext(search, reverse) {
        if (search === '') {
            this.setState({ search: null })
            return
        }

        let pattern
        try {
            pattern = new RegExp(search)
        } catch (e) {
            return
        }

        let position = this.state.scrollIndex
        if (position === undefined) {
            position = -1
        }

        let nextPosition = reverse ? position - 1 : position + 1
        position = this.searchLogs(this.state.filterLogs, nextPosition, pattern, reverse)
        if (position === -1) {
            nextPosition = reverse ? this.state.filterLogs.length - 1 : 0
            position = this.searchLogs(this.state.filterLogs, nextPosition, pattern, reverse)
        }
        this.setState({
            scrollIndex: position == -1 ? undefined : position
        })
    }

    saveLogsRange(e) {
        this.setState({
            logsRange: e
        })
    }

    render() {
        let { filterLogs, pattern, labels, search, showFullLog } = this.state
        labels = labels.filter(label => label.text !== '')
        const highlightLog = this.state.scrollIndex !== undefined ? filterLogs[this.state.scrollIndex] : null

        return (
            <div style={styles.main}>
                <div style={styles.toolbar}>
                    <div>Filter:&nbsp;</div>
                    <div style={{ flex: 1 }}>
                        <Filter
                            focus={this.state.activeFilter}
                            onFilter={this.updateFilterIfNeed.bind(this)}
                        />
                    </div>
                    <Search
                        onSearch={this.searchNext.bind(this)}
                    />
                    <GoToLine goto={this.gotoLine.bind(this)} />
                </div>
                <div className='content'>
                    <AutoSizer>
                        {({ width, height }) => (
                            <List
                                onRowsRendered={this.saveLogsRange.bind(this)}
                                scrollToIndex={this.state.scrollIndex}
                                rowRenderer={this.logRenderer.bind(this)}
                                rowCount={filterLogs.length}
                                rowHeight={17}
                                height={height}
                                width={width}
                            />
                        )}
                    </AutoSizer>
                </div>
                <div>
                    <Labels
                        labels={this.state.labels}
                        onChange={labels => {
                            console.log(labels)
                            this.setState({ labels })
                        }}
                    />
                </div>
            </div>
        )
    }
}

ReactDOM.render(<Main />, document.getElementById('app'))
