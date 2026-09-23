

var s1 = document.createElement('script');
s1.setAttribute('src', window.root+"lib/vue.min.js");

document.head.appendChild(s1);

s1 = document.createElement('script');
s1.setAttribute('src', window.root+"lib/httpVueLoader.js");
document.head.appendChild(s1);

//Root styles - prevent scrollbar in body, consistent default font
var css = document.createElement("style");
css.type = "text/css";
var styles = "body{margin:0; padding:0;} *{font-family: 'Segoe UI',Arial,sans-serif;}";
css.appendChild(document.createTextNode(styles));
document.head.appendChild(css);

window.onload = ()=>{
    
    var appdiv = document.createElement('div');
    appdiv.setAttribute('id',"app");
    appdiv.id = 'app';
    appdiv.style.height = "100vh";
    document.body.appendChild(appdiv);
    let comp = document.createElement('my-component');
    appdiv.appendChild(comp);
    let unique = '?rand='+Math.random();
    
    window.components = [
        { name:'device', path: window.root+'vue/device.vue'+unique },
        { name:'ota', path: window.root+'vue/ota.vue'+unique },
        { name:'filesystem', path: window.root+'vue/filesystem.vue'+unique },
        { name:'info', path: window.root+'vue/info.vue'+unique },
        { name:'flash', path: window.root+'vue/flash.vue'+unique },
        { name:'control', path: window.root+'vue/control.vue'+unique },
        { name:'tools', path: window.root+'vue/tools.vue'+unique },
        { name:'import', path: window.root+'vue/import.vue'+unique },
        { name:'logs', path: window.root+'vue/logs.vue'+unique },
        { name:'gpioDoctor', path: window.root+'vue/gpioDoctor.vue'+unique },
        { name:'myComponent', path: window.root+'vue/myComponent.vue'+unique },
    ];

    let numcomponents = 0;
    
    let addComponent = ()=>{
        let component = httpVueLoader(window.components[numcomponents].path);
        component().then( data =>{
            window.components[numcomponents].data = data;
            numcomponents++;
            if (numcomponents < window.components.length){
                addComponent();
            } else {
                new Vue({
                    el: '#app',
                    components: {
                        'my-component': window.components[numcomponents-1].data
                    }
                });
            }
        });
    }
    
    window.getComponent = (name)=>{
        for (let i = 0; i < numcomponents; i++){
            if (window.components[i].name === name){
                return window.components[i].data;
            }
        }
        return undefined;
    }


    addComponent();
};

