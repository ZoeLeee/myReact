//全局的更新深度标识
let updateDepth = 0;
//全局的更新队列，所有的差异都存在这里
let diffQueue = [];

//差异更新的几种类型
//1.新的component类型在老的集合里也有，并且element是可以更新的类型，在generateComponentChildren我们已经调用了receiveComponent，这种情况下prevChild=nextChild,那我们就需要做出移动的操作，可以复用以前的dom节点。
//2.老的component类型，在新的集合里也有，但是对应的element不同了不能直接复用直接更新，那我们也得删除。
//3.新的component类型不在老的集合里，那么就是全新的节点，我们需要插入新的节点
const UPATE_TYPES = {
  MOVE_EXISTING: 1, 
  REMOVE_NODE: 2,
  INSERT_MARKUP: 3
}
Object.freeze(UPATE_TYPES);


const _shouldUpdateReactComponent = (prevElement, nextElement) => {
  if (prevElement != null && nextElement != null) {
    let prevType = typeof prevElement;
    let nextType = typeof nextElement;
    if (prevType === 'string'
      || prevType === 'number') {
      return nextType === 'string' || nextType === 'number';
    } else {
      return nextType === 'object'
        && prevElement.type === nextElement.type
        && prevElement.key === nextElement.key;
    }
  }
  return false;
}

//普通的children是一个数组，此方法把它转换成一个map,key就是element的key,如果是text节点或者element创建时并没有传入key,就直接用在数组里的index标识
function flattenChildren(componentChildren) {
  let child;
  let name;
  let childrenMap = {};
  for (let i = 0; i < componentChildren.length; i++) {
      child = componentChildren[i];
      name = child && child._currentelement && child._currentelement.key ? child._currentelement.key : i.toString();
      childrenMap[name] = child;
  }
  return childrenMap;
}

//主要用来生成子节点elements的component集合
//这边注意，有个判断逻辑，如果发现是更新，就会继续使用以前的componentInstance,调用对应的receiveComponent。
//如果是新的节点，就会重新生成一个新的componentInstance，
function generateComponentChildren(prevChildren, nextChildrenElements) {
  let nextChildren = {};
  nextChildrenElements = nextChildrenElements || [];
  nextChildrenElements.forEach((element,index) => {
    let name = element.key ? element.key : index;
    let prevChild = prevChildren && prevChildren[name];
    let prevElement = prevChild && prevChild._currentElement;
    let nextElement = element;

    //调用_shouldUpdateReactComponent判断是否是更新
    if (_shouldUpdateReactComponent(prevElement, nextElement)) {
        //更新的话直接递归调用子节点的receiveComponent就好了
        prevChild.receiveComponent(nextElement);
        //然后继续使用老的component
        nextChildren[name] = prevChild;
    } else {
        //对于没有老的，那就重新新增一个，重新生成一个component
        let nextChildInstance = instantiateReactComponent(nextElement, null);
        //使用新的component
        nextChildren[name] = nextChildInstance;
    }
  });
  return nextChildren;
}

//用于将childNode插入到指定位置
function insertChildAt(parentNode, childNode, index) {
  let beforeChild = parentNode.children[index];
  if(beforeChild){
    parentNode.insertBefore(childNode,beforeChild);
  }else{
    parentNode.append(childNode);
  }
}