const React = require('react')

class Label extends React.Component {
    constructor(props) {
        super(props)
    }

    onChange(e) {
        const text = e.target.value

        try {
            const pattern = new RegExp(text)
            this.props.onChange(text)
        } catch (e) {
            // nothing to do
        }
    }

    render() {
        const { label } = this.props

        return (
            <div
                className='label'
                style={{ background: label.color }}>
                <input
                    type='text'
                    value={label.value}
                    onChange={this.onChange.bind(this)}
                />
            </div>
        )
    }
}

module.exports = Label
