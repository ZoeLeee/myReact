'use strict'

let readyEvent = new Event('mountReady');

class ReactClass {
  constructor(props) {
    this.props = props;
    this.state = this.getInitialState ? this.getInitialState() : null;
  }
  getInitialState() { }
  componentWillMount() { }
  componentDidMount() { }
  render() { }
}
class ReactElement {
  constructor(type, key, props) {
    this.type = type;
    this.key = key;
    this.props = props;
  }
}

class React {
  static nextReactRootIndex = 0;
  static createElement(type, config, ...children) {
    let props = {};
    let key = (config && config.key) || null;
    Object.assign(props, config);
    props.children = [...children];
    return new ReactElement(type, key, props);
  }
  static createClass(spec) {
    //生成一个子类
    var Constructor = function (props) {
      this.props = props;
      this.state = this.getInitialState ? this.getInitialState() : null;
    }
    //原型继承，继承超级父类
    Constructor.prototype = new ReactClass();
    Constructor.prototype.constructor = Constructor;
    //混入spec到原型
    for (let i in spec)
      Constructor.prototype.i = spec[i]
    return Constructor;
  }
  static render(el, container) {
    let componentIntance = instantiateReactComponent(el);
    let html = componentIntance.mountComponent(this.nextReactRootIndex++);
    container.innerHHML = "";
    container.append(html);
    document.dispatchEvent(readyEvent);
  }
}