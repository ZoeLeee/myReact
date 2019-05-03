'use strict'

let readyEvent = new Event('mountReady');

class ReactClass {
  constructor(props) {
    this._reactInternalInstance = null;
    this.props = props;
    this.state = this.getInitialState ? this.getInitialState() : null;
  }
  setState(newState) {
    //还记得我们在ReactCompositeComponent里面mount的时候 做了赋值
    //所以这里可以拿到 对应的ReactCompositeComponent的实例_reactInternalInstance
    this._reactInternalInstance.receiveComponent(null, newState);
  }
  getInitialState() { }
  componentWillMount() { }
  componentDidMount() { }
  shouldComponentUpdate() { }
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
    props.children = children.flat();
    return new ReactElement(type, key, props);
  }
  static render(el, container) {
    let componentIntance = instantiateReactComponent(el);
    let html = componentIntance.mountComponent(this.nextReactRootIndex++);
    container.innerHHML = "";
    container.append(html);
    document.dispatchEvent(readyEvent);
  }
}