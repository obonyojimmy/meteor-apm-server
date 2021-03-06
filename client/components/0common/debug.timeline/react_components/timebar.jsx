import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';

TimelineComponent.TimeBar = createReactClass({
  displayName: 'TimelineComponent.TimeBar',
  propTypes: {
    // id for the timebar
    itemId: PropTypes.string.isRequired,
    // array of sections in the timebar
    sections: PropTypes.array.isRequired
  },
  createTimeBarSection(section, index) {
    var itemId = this.props.itemId;
    var key = itemId + index;

    return (
      <rect
        key={key}
        x={section.x}
        y={section.y}
        width={section.width}
        height={section.height}
        fill={section.fill}
        onClick={TimelineComponent.actions.showTraceModal.bind(null, itemId)}
      />
    );
  },
  render() {
    var y = this.props.scrollTop + 10;
    return (
      <svg className="timebar">
        <rect x="0" y={y} width="100%" height="15" fill={this.props.rowColor} />
        {this.props.sections.map(this.createTimeBarSection)}
      </svg>
    );
  }
});
