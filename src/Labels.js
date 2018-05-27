const React = require('react')
const Label = require('./Label')

class Labels extends React.Component {
    constructor(props) {
        super(props)

        this.colors = ['#9b59b6', '#3498db', '#95a5a6', '#34495e',]
    }


    addLabel() {
        let labels = this.props.labels
        if (labels.length >= this.colors.length) {
            console.log('no available colors')
            return
        }

        labels = labels.slice()
        labels.push({
            text: '',
            color: this.colors[labels.length]
        })
        this.props.onChange(labels)
    }

    updateLabel(label, text) {
        let labels = this.props.labels.slice()
        const index = labels.indexOf(label)
        labels[index] = {
            color: label.color,
            text
        }
        this.props.onChange(labels)
    }

    render() {
        return (
            <div className='labels'>
                {this.props.labels.map((label) => {
                    return (
                        <Label
                            key={label.color}
                            onChange={text => this.updateLabel(label, text)}
                            label={label}
                        />
                    )
                })}

                <button
                    onClick={this.addLabel.bind(this)}>
                    添加
                </button>
            </div>
        )
    }
}

module.exports = Labels
