const React = require('react')

class Log extends React.Component {
    constructor(props) {
        super(props)
    }

    static resolveKeys(data) {
        let keys = Object.keys(data)
        const importantKeys = ['time', 'level', 'Node', 'Server', 'Clerk', 'Log', 'ShardMaster', 'Event', 'action']
        keys = keys.filter(key => importantKeys.indexOf(key) == -1)
        keys = importantKeys.concat(keys)
        return keys
    }

    static convertToText(log) {
        if (log.type === 'raw') {
            return log.data.text
        }

        const keys = Log.resolveKeys(log.data)
        let items = keys.map(key => {
            if (!(key in log.data)) {
                return null
            }

            const value = log.data[key]
            let text = ''
            if (typeof (value) === 'string') {
                text = `${key}="${value}"`
            } else {
                text = `${key}="${JSON.stringify(value)}"`
            }
            return text
        })
        items = items.filter(Boolean)
        return items.join(' ')
    }

    static paddingId(id, total) {
        id = String(id)
        total = String(total)
        const count = total.length - id.length
        for (let i = 0; i < count; i++) {
            id = "&nbsp;" + id
        }
        return id
    }

    renderId(id) {
        id = Log.paddingId(id, this.props.total)
        return (
            <span className='span id' dangerouslySetInnerHTML={{ __html: id }} />
        )
    }

    resolveStyle(label) {
        return {
            color: '#fff',
            background: label.color,
            borderRadius: 4,
            padding: '0px 2px',
            margin: '0px -2px'
        }
    }

    render() {
        const { log, labels, highlight, index } = this.props
        const keys = Log.resolveKeys(log.data)
        const logText = Log.convertToText(log)

        let logClass = highlight ? 'log-wrapper highlight' : 'log-wrapper'
        let matchedLabel
        for (let i = 0; i < labels.length; i++) {
            const label = labels[i]
            const pattern = new RegExp(label.text)
            if (pattern.test(logText)) {
                matchedLabel = label
                break
            }
        }

        if (matchedLabel) {
            const pattern = new RegExp(matchedLabel.text)
            const r = pattern.exec(logText)
            const match = r[0]
            const from = r.index
            const log1 = logText.substr(0, r.index)
            const log2 = logText.substr(r.index, match.length)
            const log3 = logText.substr(r.index + match.length)
            return (
                <div className={logClass}>
                    {this.props.full &&
                        <div className='popup'>
                            <pre
                                className='span'
                                dangerouslySetInnerHTML={{
                                    __html: JSON.stringify(log.data, null, 4)
                                }}
                            />
                        </div>}
                    <div
                        onClick={this.props.onClick}
                        className='log'>
                        {this.renderId(log.id)}
                        <span className='span'>{log1}</span>
                        <span className='span' style={this.resolveStyle(matchedLabel)}>{log2}</span>
                        <span className='span'>{log3}</span>
                    </div>
                </div>
            )
        } else {
            return (
                <div className={logClass}>
                    {this.props.full &&
                        <div className='popup'>
                            <pre
                                className='span'
                                dangerouslySetInnerHTML={{
                                    __html: JSON.stringify(log.data, null, 4)
                                }}
                            />
                        </div>}
                    <div
                        onClick={this.props.onClick}
                        className='log'>
                        {this.renderId(log.id)}
                        <span className='span'>{logText}</span>
                    </div>
                </div>
            )
        }
    }
}

module.exports = Log
