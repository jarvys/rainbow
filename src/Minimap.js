const React = require('react')
const {
    AutoSizer,
} = require('react-virtualized')

const styles = {
    blocks: {
        height: '100%',
        width: '100%',
        position: 'relative'
    }
}

class Block extends React.Component {
    constructor(props) {
        super(props)
    }

    resolveStyle() {
        const { offset, height, color } = this.props
        return {
            position: 'absolute',
            background: color,
            top: offset,
            width: '100%',
            height,
        }
    }

    render() {
        return (
            <div style={this.resolveStyle()}></div>
        )
    }
}

class Minimap extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        let { logs, height, width } = this.props
        const blockHeight = Math.max(height / logs.length, 2)
        const blocks = []
        logs.forEach((log, index) => {
            if (log.label) {
                blocks.push({
                    id: log.id,
                    color: log.label.color,
                    offset: index / logs.length * height
                })
            }
        })

        const style = Object.assign({}, styles.block, {
            width: width,
            height: height
        })

        return (
            <div style={style}>
                {blocks.map(block => {
                    return (
                        <Block
                            key={block.id}
                            color={block.color}
                            height={blockHeight}
                            offset={block.offset}
                        />
                    )
                })}
            </div>
        )
    }
}

class MinimapWrapper extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {

        return (
            <AutoSizer>
                {({ width, height }) => (
                    <Minimap
                        width={width}
                        height={height}
                        {...this.props}
                    />
                )}
            </AutoSizer>
        )
    }
}

module.exports = MinimapWrapper
