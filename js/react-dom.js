'use strict'

class ReactComponent {
  constructor() {
    this._rootNodeID = null;
  }
  mountComponent(rootId) {
    //赋值标识
    this._rootNodeID = rootId;
  }
}

class ReactDOMTextComponent extends ReactComponent {
  constructor(text) {
    super();
    this._currentElement = '' + text;
  }
  mountComponent(rootId) {
    super.mountComponent(rootId);
    let span=document.createElement('span');
    span.setAttribute('data-reactid',rootId);
    span.innerText=this._currentElement;
    return span;
  }
}

class ReactDomComponent extends ReactComponent {
  constructor(el) {
    super();
    this._currentElement = el;
  }
  mountComponent(rootId) {
    super.mountComponent(rootId);
    let props = this._currentElement.props;

    //假设都是html元素类型，没有自定义元素，父节点
    let parentElement = document.createElement(this._currentElement.type);
    parentElement.setAttribute("data-reactid", rootId);
    for (let key in props) {
      if (/^on[A-Za-z]/.test(key)) {
        let eventType = key.replace('on', '').toLowerCase();
        parentElement.addEventListener(eventType, props[key]);
      }
      if (props[key] && key != 'children' && !/^on[A-Za-z]/.test(key)) {
        parentElement.setAttribute(key, props[key]);
      }
    }

    let content = [];
    //获取子节点
    let children = props.children || [];
    let childrenInstances = [];
    children.forEach((el, i) => {
      let instanceCom = instantiateReactComponent(el);
      instanceCom._mountIndex = i;
      childrenInstances.push(instanceCom);
      //子节点的rootId是父节点的rootId加上新的key也就是顺序的值拼成的新值
      let childRootId = this._rootNodeID + '-' + i;
      let childMarkup = instanceCom.mountComponent(childRootId);
      content.push(childMarkup);
    });

    for(let c of content){
      parentElement.append(c);
    }

    //留给以后更新时用的这边先不用管
    this._renderedChildren = childrenInstances;
    return parentElement;
  }
}

class ReactCompositeComponent extends ReactComponent {
  constructor(element) {
    super();
    //存放对应的ReactClass的实例
    this._instance = null;
    //存放元素element对象
    this._currentElement = element;
  }
  mountComponent(rootID) {
    super.mountComponent(rootID);
    //拿到当前元素对应的属性值
    let publicProps = this._currentElement.props;
    //拿到对应的ReactClass
    let ReactClass = this._currentElement.type;
    // Initialize the public class
    let inst = new ReactClass(publicProps);
   
    this._instance = inst;
    //保留对当前comonent的引用，下面更新会用到
    inst._reactInternalInstance = this;

    if (inst.componentWillMount) {
      inst.componentWillMount();
      //这里在原始的reactjs其实还有一层处理，就是  componentWillMount调用setstate，不会触发rerender而是自动提前合并，这里为了保持简单，就略去了
    }
    //调用ReactClass的实例的render方法,返回一个element或者一个文本节点
    let renderedElement = this._instance.render();
    //得到renderedElement对应的component类实例
    let renderedComponentInstance = instantiateReactComponent(renderedElement);
    this._renderedComponent = renderedComponentInstance; //存起来留作后用

    //拿到渲染之后的字符串内容，将当前的_rootNodeID传给render出的节点
    let renderedMarkup = renderedComponentInstance.mountComponent(this._rootNodeID);

    //之前我们在React.render方法最后触发了mountReady事件，所以这里可以监听，在渲染完成后会触发。
    document.addEventListener('mountReady', () => {
      //调用inst.componentDidMount
      inst.componentDidMount && inst.componentDidMount();
    })
    return renderedMarkup;
  }
}

function instantiateReactComponent(node) {
  if (typeof node === 'string' || typeof node === 'number') {
    return new ReactDOMTextComponent(node);
  }
  if (typeof node === 'object' && typeof node.type === 'string') {
    return new ReactDomComponent(node);
  }
  //自定义的元素节点
  if (typeof node === 'object' && typeof node.type === 'function') {
    //注意这里，使用新的component,专门针对自定义元素
    return new ReactCompositeComponent(node);
  }
}