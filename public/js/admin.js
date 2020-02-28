const deleteProduct = (btn) => {
    const csrf = btn.parentNode.querySelector('[name = _csrf]').value;
    const productId = btn.parentNode.querySelector('[name = productId]').value;

    const productElement = btn.closest('article');
    const pagination = btn.closest('section');
    // console.log(csrf);
    // console.log(productId);

    fetch('/admin/product/'+productId ,{
        method : 'DELETE',
        headers : {
            'csrf-token' : csrf
        }
    })
    .then(result => {

        return result.json();
        
    })
    .then(data => {
        console.log(data);
        //pagination.remove();
        productElement.remove();
       
    })
    .catch(err => {
        console.log(err);
    })
}