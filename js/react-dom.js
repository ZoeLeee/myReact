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
    let span = document.createElement('span');
    span.setAttribute('data-reactid', rootId);
    span.innerText = this._currentElement;
    return span;
  }
  receiveComponent(nextText) {
    let nextStringText = '' + nextText;
    //跟以前保存的字符串比较
    if (nextStringText !== this._currentElement) {
      this._currentElement = nextStringText;
      //替换整个节点
      document.querySelector('[data-reactid="' + this._rootNodeID + '"]').innerText = this._currentElement;
    }
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

    for (let c of content) {
      parentElement.append(c);
    }

    //留给以后更新时用的这边先不用管
    this._renderedChildren = childrenInstances;
    return parentElement;
  }
  receiveComponent(nextElement) {
    let lastProps = this._currentElement.props;
    let nextProps = nextElement.props;

    this._currentElement = nextElement;
    //需要单独的更新属性
    // this._updateDOMProperties(lastProps, nextProps);
    //再更新子节点
    console.log(nextElement.props.children);
    this._updateDOMChildren(nextElement.props.children);
  }
  _updateDOMProperties(lastProps, nextProps) {
    let propKey;
    //遍历，当一个老的属性不在新的属性集合里时，需要删除掉。
    let oldElement = document.querySelector('[data-reactid="' + this._rootNodeID + '"]');

    for (propKey in lastProps) {
      //新的属性里有，或者propKey是在原型上的直接跳过。这样剩下的都是不在新属性集合里的。需要删除
      if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
        continue;
      }
      //对于那种特殊的，比如这里的事件监听的属性我们需要去掉监听
      if (/^on[A-Za-z]/.test(propKey)) {
        let eventType = propKey.replace('on', '').toLowerCase();
        //针对当前的节点取消事件代理
        oldElement.removeEventListener(eventType, lastProps[propKey]);
      }
      else {
        //从dom上删除不需要的属性
        oldElement.removeAttribute(propKey);
      }
    }

    //对于新的属性，需要写到dom节点上
    for (propKey in nextProps) {
      //对于事件监听的属性我们需要特殊处理
      if (/^on[A-Za-z]/.test(propKey)) {
        let eventType = propKey.replace('on', '').toLowerCase();
        //以前如果已经有，说明有了监听，需要先去掉
        if (lastProps[propKey]) {
          oldElement.removeEventListener(eventType, lastProps[propKey]);
        }
        //针对当前的节点添加事件代理,以_rootNodeID为命名空间
        oldElement.addEventListener(eventType, nextProps[propKey])
      }
      else {
        if (propKey !== 'children') {
          //添加新的属性，或者是更新老的同名属性
          oldElement.setAttribute(propKey, nextProps[propKey]);
        }
      }
    }
  }
  _updateDOMChildren(nextChildrenElements) {
    updateDepth++
    //_diff用来递归找出差别,组装差异对象,添加到更新队列diffQueue。
    this._diff(diffQueue, nextChildrenElements);
    updateDepth--
    if (updateDepth === 0) {
      //在需要的时候调用patch，执行具体的dom操作
      this._patch(diffQueue);
      diffQueue.length = 0;
      
    }
  }
  _diff(diffQueue, nextChildrenElements) {
    var self = this;
    //拿到之前的子节点的 component类型对象的集合,这个是在刚开始渲染时赋值的，记不得的可以翻上面
    //_renderedChildren 本来是数组，我们搞成map
    var prevChildren = flattenChildren(this._renderedChildren);
    //生成新的子节点的component对象集合，这里注意，会复用老的component对象
    var nextChildren = generateComponentChildren(prevChildren, nextChildrenElements);
    //重新赋值_renderedChildren，使用最新的。
    this._renderedChildren = []
    this._renderedChildren.push(...Object.values(nextChildren));

    let oldElement = document.querySelector('[data-reactid="' + this._rootNodeID + '"]');
    var nextIndex = 0; //代表到达的新的节点的index

    /**注意新增代码**/
    var lastIndex = 0;//代表访问的最后一次的老的集合的位置
    var nextIndex = 0;//代表到达的新的节点的index

    //通过对比两个集合的差异，组装差异节点添加到队列中
    for (let name in nextChildren) {
      if (!nextChildren.hasOwnProperty(name)) {
        continue;
      }
      var prevChild = prevChildren && prevChildren[name];
      var nextChild = nextChildren[name];
      //相同的话，说明是使用的同一个component,所以我们需要做移动的操作
      if (prevChild === nextChild) {
        //添加差异对象，类型：MOVE_EXISTING
        diffQueue.push({
          parentId: self._rootNodeID,
          parentNode: oldElement,
          type: UPATE_TYPES.MOVE_EXISTING,
          fromIndex: prevChild._mountIndex,
          toIndex: nextIndex
        })
        /**注意新增代码**/
        prevChild._mountIndex < lastIndex && diffQueue.push({
          parentId: this._rootNodeID,
          parentNode: $('[data-reactid=' + this._rootNodeID + ']'),
          type: UPATE_TYPES.REMOVE_NODE,
          fromIndex: prevChild._mountIndex,
          toIndex: null
        })
        lastIndex = Math.max(prevChild._mountIndex, lastIndex);
      } else {
        //如果不相同，说明是新增加的节点
        //但是如果老的还存在，就是element不同，但是component一样。我们需要把它对应的老的element删除。
        if (prevChild) {
          //添加差异对象，类型：REMOVE_NODE
          diffQueue.push({
            parentId: self._rootNodeID,
            parentNode: oldElement,
            type: UPATE_TYPES.REMOVE_NODE,
            fromIndex: prevChild._mountIndex,
            toIndex: null
          })

          //如果以前已经渲染过了，记得先去掉以前所有的事件监听，通过命名空间全部清空
          if (prevChild._rootNodeID) {
            //TODO:
          }
          /**注意新增代码**/
          lastIndex = Math.max(prevChild._mountIndex, lastIndex);
        }
        //新增加的节点，也组装差异对象放到队列里
        //添加差异对象，类型：INSERT_MARKUP
        diffQueue.push({
          parentId: self._rootNodeID,
          parentNode: oldElement,
          type: UPATE_TYPES.INSERT_MARKUP,
          fromIndex: null,
          toIndex: nextIndex,
          markup: nextChild.mountComponent() //新增的节点，多一个此属性，表示新节点的dom内容
        })
      }
      //更新mount的index
      nextChild._mountIndex = nextIndex;
      nextIndex++;
    }

    //对于老的节点里有，新的节点里没有的那些，也全都删除掉
    for (name in prevChildren) {
      if (prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))) {
        //添加差异对象，类型：REMOVE_NODE
        diffQueue.push({
          parentId: self._rootNodeID,
          parentNode: oldElement,
          type: UPATE_TYPES.REMOVE_NODE,
          fromIndex: prevChild._mountIndex,
          toIndex: null
        })
        //如果以前已经渲染过了，记得先去掉以前所有的事件监听
        if (prevChildren[name]._rootNodeID) {
          // $(document).undelegate('.' + prevChildren[name]._rootNodeID);
          //TODO:
        }
      }
    }
  }
  _patch(updates) {
    let update;
    let initialChildren = {};
    let deleteChildren = [];
    for (let i = 0; i < updates.length; i++) {
      update = updates[i];

      if (update.type === UPATE_TYPES.MOVE_EXISTING || update.type === UPATE_TYPES.REMOVE_NODE) {
        let updatedIndex = update.fromIndex;
        let updatedChild = update.parentNode.children[updatedIndex];
        let parentID = update.parentId;

        //所有需要更新的节点都保存下来，方便后面使用
        initialChildren[parentID] = initialChildren[parentID] || [];
        //使用parentID作为简易命名空间
        initialChildren[parentID][updatedIndex] = updatedChild;

        //所有需要修改的节点先删除,对于move的，后面再重新插入到正确的位置即可
        deleteChildren.push(updatedChild)
      }

    }
    //删除所有需要先删除的
    deleteChildren.forEach(child => {
      child.remove();
    })

    //再遍历一次，这次处理新增的节点，还有修改的节点这里也要重新插入
    for (let k = 0; k < updates.length; k++) {
      update = updates[k];
      switch (update.type) {
        case UPATE_TYPES.INSERT_MARKUP:
          insertChildAt(update.parentNode, update.markup, update.toIndex);
          break;
        case UPATE_TYPES.MOVE_EXISTING:
          insertChildAt(update.parentNode, initialChildren[update.parentId][update.fromIndex], update.toIndex);
          break;
        case UPATE_TYPES.REMOVE_NODE:
          // 什么都不需要做，因为上面已经帮忙删除掉了
          break;
      }
    }
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
    let renderedHtmlEl = renderedComponentInstance.mountComponent(this._rootNodeID);

    //之前我们在React.render方法最后触发了mountReady事件，所以这里可以监听，在渲染完成后会触发。
    document.addEventListener('mountReady', () => {
      //调用inst.componentDidMount
      inst.componentDidMount && inst.componentDidMount();
    })
    return renderedHtmlEl;
  }
  receiveComponent(nextElement, newState) {
    this._currentElement = nextElement || this._currentElement;
    let inst = this._instance;
    let nextState = Object.assign({}, inst.state, newState);
    let nextProps = this._currentElement.props;

    inst.state = nextState;

    //如果inst有shouldComponentUpdate并且返回false。说明组件本身判断不要更新，就直接返回。
    if (inst.shouldComponentUpdate
      && (inst.shouldComponentUpdate(nextProps, nextState) === false))
      return;

    //生命周期管理，如果有componentWillUpdate，就调用，表示开始要更新了。
    if (inst.componentWillUpdate) inst.componentWillUpdate(nextProps, nextState);

    let prevComponentInstance = this._renderedComponent;
    let prevRenderedElement = prevComponentInstance._currentElement;
    //重新执行render拿到对应的新element;

    let nextRenderedElement = this._instance.render();

    //判断是需要更新还是直接就重新渲染
    //注意这里的_shouldUpdateReactComponent跟上面的不同哦 这个是全局的方法
    if (_shouldUpdateReactComponent(prevRenderedElement, nextRenderedElement)) {
      //如果需要更新，就继续调用子节点的receiveComponent的方法，传入新的element更新子节点。
      prevComponentInstance.receiveComponent(nextRenderedElement);
      //调用componentDidUpdate表示更新完成了
      inst.componentDidUpdate && inst.componentDidUpdate();
    }
    else {
      //如果发现完全是不同的两种element，那就干脆重新渲染了
      let thisID = this._rootNodeID;
      //重新new一个对应的component，
      this._renderedComponent = this._instantiateReactComponent(nextRenderedElement);
      //重新生成对应的元素内容
      let nextMarkup = _renderedComponent.mountComponent(thisID);
      //替换整个节点
      document.querySelector('[data-reactid="' + this._rootNodeID + '"]').replaceWith(nextMarkup);
    }

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